use std::time::SystemTime;

use anyhow::format_err;
use async_trait::async_trait;
use bitcoin::secp256k1;
use fedi_social_client_v1::common::{
    BackupId, BackupRequest, DoubleEncryptedData, EncryptedRecoveryShare, RecoveryId,
    RecoveryRequest, SerdeEncodable, SignedBackupRequest, SignedRecoveryRequest,
    VerificationDocument,
};
use fedi_social_client_v1::config::FediSocialClientConfig;
use fedimint_core_v1::api::{DynModuleApi, FederationApiExt, FederationResult, IFederationApi};
use fedimint_core_v1::core::ModuleInstanceId;
use fedimint_core_v1::module::ApiRequestErased;
use fedimint_core_v1::task::{MaybeSend, MaybeSync};
use fedimint_core_v1::PeerId;
use fedimint_derive_secret_v1::{ChildId, DerivableSecret};
use secp256k1::Secp256k1;
pub use v1_social::*;

// TODO: pick an id, document it, make sure they don't collide
pub const SOCIAL_RECOVERY_SECRET_CHILD_ID: ChildId = ChildId(16);
const SOCIAL_RECOVERY_BACKUP_SNAPSHOT_TYPE_CHILD_ID: ChildId = ChildId(1);

pub struct SocialBackup {
    /// Secret derived from the `root_secret` for this module / functionality
    /// (level == 2)
    pub module_secret: DerivableSecret,

    pub module_id: ModuleInstanceId,

    pub config: fedi_social_client_v1::config::FediSocialClientConfig,

    pub api: DynModuleApi,
}

impl SocialBackup {
    /// Create User Recovery File that user needs to store privately (in
    /// multiple copies)
    pub fn prepare_recovery_file(
        &self,
        verification_document: VerificationDocument,
        seed_phrase: UserSeedPhrase,
    ) -> RecoveryFile {
        let double_encrypted_seed = DoubleEncryptedData::encrypt(
            seed_phrase,
            self.get_backup_encryption_key(),
            self.config.pk(),
        );

        RecoveryFile {
            magic: *RecoveryFile::MAGIC_PREFIX,
            signing_sk: SerdeEncodable(
                Self::get_backup_signing_key_static(&self.module_secret).secret_key(),
            ),
            encryption_key: Self::get_backup_encryption_key_static_raw(&self.module_secret),
            verification_document,
            double_encrypted_seed,
        }
    }

    fn prepare_social_recovery_backup(
        &self,
        recovery_file: &RecoveryFile,
    ) -> anyhow::Result<SignedBackupRequest> {
        let signing_key = self.get_backup_signing_key();

        let backup_request = BackupRequest {
            id: BackupId(signing_key.x_only_public_key().0),
            timestamp: SystemTime::now(),
            verification_doc_hash: recovery_file.verification_document.id(),
            double_encrypted_seed: recovery_file.double_encrypted_seed.clone(),
        };

        backup_request.sign(&signing_key)
    }

    pub async fn upload_backup_to_federation(
        &self,
        recovery_file: &RecoveryFile,
    ) -> anyhow::Result<()> {
        let backup_request = self.prepare_social_recovery_backup(recovery_file)?;
        self.api
            .social_backup(self.module_id, &backup_request)
            .await?;

        Ok(())
    }

    fn get_backup_encryption_key_static(secret: &DerivableSecret) -> fedimint_aead_v1::LessSafeKey {
        fedimint_aead_v1::LessSafeKey::new(
            Self::get_backup_secret_static(secret).to_chacha20_poly1305_key(),
        )
    }

    fn get_backup_encryption_key_static_raw(secret: &DerivableSecret) -> [u8; 32] {
        Self::get_backup_secret_static(secret).to_chacha20_poly1305_key_raw()
    }

    fn get_backup_signing_key_static(secret: &DerivableSecret) -> secp256k1::KeyPair {
        Self::get_backup_secret_static(secret)
            .to_secp_key(&Secp256k1::<secp256k1::SignOnly>::gen_new())
    }

    fn get_backup_secret_static(module_secret: &DerivableSecret) -> DerivableSecret {
        // level 1 is client.external_secret(), then we derive a key from that making it
        // level 2
        assert_eq!(module_secret.level(), 2);
        module_secret.child_key(SOCIAL_RECOVERY_BACKUP_SNAPSHOT_TYPE_CHILD_ID)
    }

    fn get_backup_encryption_key(&self) -> fedimint_aead_v1::LessSafeKey {
        Self::get_backup_encryption_key_static(&self.module_secret)
    }

    fn get_backup_signing_key(&self) -> secp256k1::KeyPair {
        Self::get_backup_signing_key_static(&self.module_secret)
    }
}

pub struct SocialRecovery {
    state: SocialRecoveryState,
    config: FediSocialClientConfig,
    module_id: ModuleInstanceId,
    api: DynModuleApi,
}

impl SocialRecovery {
    /// Start a new recovery process
    pub fn new_start(
        module_id: ModuleInstanceId,
        config: FediSocialClientConfig,
        api: DynModuleApi,
        recovery_file: RecoveryFile,
    ) -> anyhow::Result<Self> {
        recovery_file.verification_document.verify_integrity()?;

        Ok(Self {
            state: SocialRecoveryState::new(recovery_file),
            config,
            api,
            module_id,
        })
    }

    /// Continue an existing recovery process from a saved
    /// [`SocialRecoveryState`]
    pub fn new_continue(
        module_id: ModuleInstanceId,
        config: FediSocialClientConfig,
        api: DynModuleApi,
        state: SocialRecoveryState,
    ) -> Self {
        Self {
            state,
            config,
            api,
            module_id,
        }
    }
    pub fn state(&self) -> &SocialRecoveryState {
        &self.state
    }

    pub fn get_backup_id(&self) -> anyhow::Result<secp256k1::XOnlyPublicKey> {
        Ok(self
            .state
            .signing_sk
            .0
            .public_key(secp256k1::SECP256K1)
            .x_only_public_key()
            .0)
    }

    /// Create a verification request and corresponding decryption key
    pub fn create_verification_request(
        &self,
        verification_doc: VerificationDocument,
    ) -> anyhow::Result<SignedRecoveryRequest> {
        let signing_keypair = self.state.signing_sk.0.keypair(secp256k1::SECP256K1);
        let signing_pk = signing_keypair.public_key();

        let request = RecoveryRequest {
            id: RecoveryId(signing_pk.x_only_public_key().0),
            timestamp: SystemTime::now(),
            verification_doc,
            recovery_session_encryption_key: SerdeEncodable(
                self.state.recovery_session_decryption_key.0.public_key(),
            ),
        };

        request.sign(&signing_keypair)
    }

    /// Upload verification request to the federation.
    ///
    /// This is for the guardians to know we are trying to recover
    /// from our social backup and so they have the full verification
    /// document available.
    pub async fn upload_verification_request(
        &self,
        req: &SignedRecoveryRequest,
    ) -> anyhow::Result<()> {
        self.api.social_recovery(self.module_id, req).await?;
        Ok(())
    }

    /// After successfull in person verification download the decryption share
    /// that the guardian should have published.
    async fn download_decryption_share_from(
        &self,
        peer_id: PeerId,
    ) -> anyhow::Result<Option<fedimint_threshold_crypto::DecryptionShare>> {
        let encrypted_share = self
            .api
            .request_raw(
                peer_id,
                "decryption_share",
                &[ApiRequestErased::new(
                    self.state
                        .signing_sk
                        .0
                        .x_only_public_key(secp256k1::SECP256K1)
                        .0,
                )
                .to_json()],
            )
            .await?;

        let encrypted_share: Option<EncryptedRecoveryShare> =
            serde_json::from_value(encrypted_share)?;

        let Some(encrypted_share) = encrypted_share else {
            return Ok(None);
        };

        let decryption_share =
            encrypted_share.decrypt_with(&self.state.recovery_session_decryption_key.0)?;

        if !self
            .config
            .federation_pk_set
            .public_key_share(peer_id.to_usize())
            .verify_decryption_share(&decryption_share, &self.state.double_encrypted_seed.0)
        {
            return Err(format_err!(
                "Decryption share from {peer_id} does not pass the threshold_crypto validation."
            ));
        }

        Ok(Some(decryption_share))
    }

    pub async fn get_decryption_share_from(&mut self, peer_id: PeerId) -> anyhow::Result<bool> {
        if self.state.shares.contains_key(&peer_id) {
            return Ok(true);
        }

        if let Some(share) = self.download_decryption_share_from(peer_id).await? {
            self.state.shares.insert(peer_id, SerdeEncodable(share));
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub fn combine_recovered_user_phrase(&self) -> anyhow::Result<UserSeedPhrase> {
        let decryption_key = fedimint_aead_v1::LessSafeKey::new(
            fedimint_aead_v1::UnboundKey::new(
                &ring::aead::CHACHA20_POLY1305,
                &self.state.encryption_key,
            )
            .expect("Decryption key stored in recovery file must be valid"),
        );

        self.state.double_encrypted_seed.decrypt(
            &self.config.federation_pk_set,
            &decryption_key,
            self.state
                .shares
                .iter()
                .map(|(peer_id, share)| (*peer_id, &share.0)),
        )
    }
}

pub struct SocialVerification {
    peer_id: PeerId,
    api: DynModuleApi,
}

impl SocialVerification {
    pub fn new(api: DynModuleApi, peer_id: PeerId) -> Self {
        Self { peer_id, api }
    }

    pub async fn download_verification_doc(
        &self,
        id: RecoveryId,
    ) -> anyhow::Result<Option<VerificationDocument>> {
        let encrypted_share = self
            .api
            .request_raw(
                self.peer_id,
                "get_verification",
                &[ApiRequestErased::new(id).to_json()],
            )
            .await?;

        let doc: Option<VerificationDocument> = serde_json::from_value(encrypted_share)?;

        Ok(doc)
    }

    pub async fn approve_recovery(
        &self,
        id: RecoveryId,
        admin_password: &str,
    ) -> anyhow::Result<()> {
        let encrypted_share = self
            .api
            .request_raw(
                self.peer_id,
                "approve_recovery",
                &[ApiRequestErased::new((id, admin_password)).to_json()],
            )
            .await?;

        let _: Option<()> = serde_json::from_value(encrypted_share)?;

        Ok(())
    }
}

#[cfg_attr(target_family = "wasm", async_trait(? Send))]
#[cfg_attr(not(target_family = "wasm"), async_trait)]
pub trait FediSocialFederationApi {
    /// Upload social recovery backup for mint to safekeep
    async fn social_backup(
        &self,
        module_id: ModuleInstanceId,
        request: &SignedBackupRequest,
    ) -> FederationResult<()>;

    async fn social_recovery(
        &self,
        module_id: ModuleInstanceId,
        request: &SignedRecoveryRequest,
    ) -> FederationResult<()>;
}

#[cfg_attr(target_family = "wasm", async_trait(? Send))]
#[cfg_attr(not(target_family = "wasm"), async_trait)]
impl<T: ?Sized> FediSocialFederationApi for T
where
    T: IFederationApi + MaybeSend + MaybeSync + 'static,
{
    /// Upload social recovery backup for mint to safekeep
    async fn social_backup(
        &self,
        _module_id: ModuleInstanceId,
        request: &SignedBackupRequest,
    ) -> FederationResult<()> {
        self.request_current_consensus("backup".into(), ApiRequestErased::new(request))
            .await
    }

    async fn social_recovery(
        &self,
        _module_id: ModuleInstanceId,
        request: &SignedRecoveryRequest,
    ) -> FederationResult<()> {
        self.request_current_consensus("recover".into(), ApiRequestErased::new(request))
            .await
    }
}
