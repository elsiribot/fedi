use std::path::PathBuf;
use std::sync::Arc;

use anyhow::{anyhow, Result};
use bech32::{self, Bech32};
use bitcoin::key::{Keypair, XOnlyPublicKey};
use bitcoin::secp256k1::{Message, Secp256k1};
use fedimint_core::db::{Database, IDatabaseTransactionOpsCoreTyped};
use fedimint_core::task::TaskGroup;
use fedimint_derive_secret::{ChildId, DerivableSecret};
use futures::StreamExt;
use nostr::nips::nip44;

use super::event::EventSink;
use super::storage::Storage;
use super::types::{RpcPublicKey, RpcSignedLnurlMessage};
use crate::api::IFediApi;
use crate::constants::{LNURL_CHILD_ID, MATRIX_CHILD_ID, NOSTR_CHILD_ID};
use crate::db::{BridgeDbPrefix, FederationPendingRejoinFromScratchKeyPrefix};
use crate::features::FeatureCatalog;
use crate::observable::ObservablePool;
use crate::storage::{AppState, DeviceIdentifier, FiatFXInfo, BRIDGE_DB_PREFIX};
use crate::types::{RpcDeviceIndexAssignmentStatus, RpcNostrPubkey, RpcNostrSecret};

// FIXME: federation-specific filename
pub const RECOVERY_FILENAME: &str = "backup.fedi";
pub const VERIFICATION_FILENAME: &str = "verification.mp4";

/// This struct encapsulates runtime dependencies like storage, event pipe, task
/// manager etc. that all the bridge services like Federations or Communities
/// need to properly function.
pub struct BridgeRuntime {
    pub storage: Storage,
    pub app_state: AppState,
    pub event_sink: EventSink,
    pub task_group: TaskGroup,
    pub fedi_api: Arc<dyn IFediApi>,
    pub global_db: Database,
    pub feature_catalog: Arc<FeatureCatalog>,
    pub observable_pool: ObservablePool,
}

impl BridgeRuntime {
    pub async fn new(
        storage: Storage,
        event_sink: EventSink,
        fedi_api: Arc<dyn IFediApi>,
        device_identifier: DeviceIdentifier,
        feature_catalog: Arc<FeatureCatalog>,
    ) -> anyhow::Result<Self> {
        let task_group = TaskGroup::new();
        let app_state = AppState::load(storage.clone(), device_identifier).await?;
        let global_db = storage.federation_database_v2("global").await?;
        let observable_pool = ObservablePool::new(event_sink.clone(), task_group.clone());

        Ok(Self {
            storage,
            app_state,
            event_sink,
            task_group,
            fedi_api,
            global_db,
            feature_catalog,
            observable_pool,
        })
    }

    pub fn bridge_db(&self) -> Database {
        self.global_db.with_prefix(vec![BRIDGE_DB_PREFIX])
    }

    /// DB for mulitspend state.
    pub fn multispend_db(&self) -> Database {
        self.global_db.with_prefix(vec![
            BRIDGE_DB_PREFIX,
            BridgeDbPrefix::MultispendPrefix as u8,
        ])
    }

    pub async fn device_index_assignment_status(
        &self,
    ) -> anyhow::Result<RpcDeviceIndexAssignmentStatus> {
        Ok(match self.app_state.ensure_device_index().await {
            Ok(index) => RpcDeviceIndexAssignmentStatus::Assigned(index),
            Err(_) => RpcDeviceIndexAssignmentStatus::Unassigned,
        })
    }

    pub async fn get_mnemonic_words(&self) -> anyhow::Result<Vec<String>> {
        Ok(self
            .app_state
            .root_mnemonic()
            .await
            .words()
            .map(|x| x.to_owned())
            .collect())
    }

    pub async fn update_cached_fiat_fx_info(&self, info: FiatFXInfo) -> anyhow::Result<()> {
        self.app_state
            .with_write_lock(|state| state.cached_fiat_fx_info = Some(info))
            .await
    }

    /// Enable logging of potentially sensitive information.
    pub async fn sensitive_log(&self) -> bool {
        self.app_state
            .with_read_lock(|f| f.sensitive_log.unwrap_or(false))
            .await
    }

    pub async fn set_sensitive_log(&self, enable: bool) -> anyhow::Result<()> {
        self.app_state
            .with_write_lock(|f| {
                f.sensitive_log = Some(enable);
            })
            .await?;
        Ok(())
    }

    pub async fn sign_lnurl_message(
        &self,
        message: Message,
        domain: String,
    ) -> Result<RpcSignedLnurlMessage> {
        let secp = Secp256k1::new();
        let lnurl_secret = self
            .app_state
            .root_secret()
            .await
            .child_key(ChildId(LNURL_CHILD_ID));
        let lnurl_secret_bytes: [u8; 32] = lnurl_secret.to_random_bytes();
        let lnurl_domain_secret = DerivableSecret::new_root(&lnurl_secret_bytes, domain.as_bytes());
        let lnurl_domain_keypair = lnurl_domain_secret.to_secp_key(&secp);
        let lnurl_domain_pubkey = lnurl_domain_keypair.public_key();
        let signature = secp.sign_ecdsa(&message, &lnurl_domain_keypair.secret_key());
        Ok(RpcSignedLnurlMessage {
            signature,
            pubkey: RpcPublicKey(lnurl_domain_pubkey),
        })
    }

    pub async fn get_nostr_pubkey(&self) -> Result<RpcNostrPubkey> {
        let nostr_pubkey = self.nostr_pubkey().await;
        let hrp = bech32::Hrp::parse_unchecked("npub");
        Ok(RpcNostrPubkey {
            npub: bech32::encode::<Bech32>(hrp, &nostr_pubkey.serialize())?,
            hex: nostr_pubkey.to_string(),
        })
    }

    async fn nostr_pubkey(&self) -> XOnlyPublicKey {
        let global_root_secret = self.app_state.root_secret().await;
        let secp = Secp256k1::new();
        let nostr_secret = global_root_secret.child_key(ChildId(NOSTR_CHILD_ID));
        let nostr_keypair = nostr_secret.to_secp_key(&secp);

        nostr_keypair.x_only_public_key().0
    }

    pub async fn get_nostr_secret(&self) -> Result<RpcNostrSecret> {
        let secp = Secp256k1::new();
        let bytes = self.nostr_secret_key(&secp).await?.secret_bytes();
        let hrp = bech32::Hrp::parse_unchecked("nsec");
        let nsec = bech32::encode::<Bech32>(hrp, &bytes)?;
        let hex = hex::encode(bytes);

        Ok(RpcNostrSecret { hex, nsec })
    }

    async fn nostr_secret_key<Ctx: bitcoin::secp256k1::Context + bitcoin::secp256k1::Signing>(
        &self,
        secp: &Secp256k1<Ctx>,
    ) -> anyhow::Result<Keypair> {
        let global_root_secret = self.app_state.root_secret().await;
        let nostr_secret = global_root_secret.child_key(ChildId(NOSTR_CHILD_ID));
        let nostr_keypair = nostr_secret.to_secp_key(secp);

        Ok(nostr_keypair)
    }

    pub async fn sign_nostr_event(&self, event_hash: String) -> Result<String> {
        let global_root_secret = self.app_state.root_secret().await;
        let secp = Secp256k1::new();
        let nostr_secret = global_root_secret.child_key(ChildId(NOSTR_CHILD_ID));
        let nostr_keypair = nostr_secret.to_secp_key(&secp);
        let data = &hex::decode(event_hash)?;
        let message = Message::from_digest_slice(data)?;
        let sig = secp.sign_schnorr(&message, &nostr_keypair);
        // Return hex-encoded string
        Ok(format!("{}", sig))
    }

    pub async fn get_matrix_secret(&self) -> DerivableSecret {
        let global_root_secret = self.app_state.root_secret().await;
        global_root_secret.child_key(ChildId(MATRIX_CHILD_ID))
    }

    pub async fn get_matrix_media_file(&self, path: PathBuf) -> Result<Vec<u8>> {
        let media_file = self
            .storage
            .read_file(&path)
            .await?
            .ok_or(anyhow!("media file not found"))?;
        Ok(media_file)
    }

    pub async fn list_federations_pending_rejoin_from_scratch(&self) -> Vec<String> {
        self.bridge_db()
            .begin_transaction_nc()
            .await
            .find_by_prefix(&FederationPendingRejoinFromScratchKeyPrefix)
            .await
            .map(|(key, _)| key.invite_code_str)
            .collect::<Vec<_>>()
            .await
    }

    /// Given a recipient's pubkey and plaintext content, encrypts and returns
    /// the ciphertext as per NIP44.
    pub async fn nip44_encrypt(&self, pubkey: String, plaintext: String) -> Result<String> {
        let secp = Secp256k1::new();
        let secret_key = self.nostr_secret_key(&secp).await?.secret_key();
        Ok(nip44::encrypt(
            &nostr::SecretKey::from(secret_key),
            &nostr::PublicKey::parse(&pubkey)?,
            plaintext,
            nip44::Version::V2,
        )?)
    }

    /// Given a recipient's pubkey and ciphertext content, decrypts and returns
    /// the plaintext as per NIP44.
    pub async fn nip44_decrypt(&self, pubkey: String, ciphertext: String) -> Result<String> {
        let secp = Secp256k1::new();
        let secret_key = self.nostr_secret_key(&secp).await?.secret_key();
        Ok(nip44::decrypt(
            &nostr::SecretKey::from(secret_key),
            &nostr::PublicKey::parse(&pubkey)?,
            ciphertext,
        )?)
    }
}
