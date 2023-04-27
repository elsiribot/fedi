use std::collections::{BTreeMap, BTreeSet};
use std::ffi::OsString;

use common::common::{SignedRecoveryRequest, VerificationDocument};
use common::{
    FediSocialCommonGen, FediSocialConsensusItem, FediSocialInput, FediSocialModuleTypes,
    FediSocialOutput, FediSocialOutputOutcome,
};
pub use fedi_social_common as common;

use async_trait::async_trait;
use common::config::{FediSocialConsensusConfig, SocialPrivateConfig};
use common::db::DbKeyPrefix;
use fedimint_core::config::{
    ClientModuleConfig, ConfigGenModuleParams, DkgResult, ServerModuleConfig,
    ServerModuleConsensusConfig, TypedServerModuleConfig, TypedServerModuleConsensusConfig,
};
use fedimint_core::core::ModuleInstanceId;
use fedimint_core::db::{Database, DatabaseVersion, ModuleDatabaseTransaction};
use fedimint_core::module::audit::Audit;
use fedimint_core::module::interconnect::ModuleInterconect;
use fedimint_core::module::{
    api_endpoint, ApiEndpoint, ApiError, ConsensusProposal, CoreConsensusVersion,
    ExtendsCommonModuleGen, InputMeta, ModuleConsensusVersion, ModuleError, PeerHandle,
    ServerModuleGen, SupportedModuleApiVersions, TransactionItemAmount,
};
use fedimint_core::server::DynServerModule;
use fedimint_core::task::TaskGroup;
use fedimint_core::{push_db_pair_items, NumPeers, OutPoint, PeerId, ServerModule};
use fedimint_server::config::distributedgen::{PeerHandleOps, ThresholdKeys};
use futures::stream::StreamExt;
use rand::rngs::OsRng;
use secp256k1::SECP256K1;
use strum::IntoEnumIterator;
use tracing::{debug, info};

use crate::common::{
    BackupId, BackupRequest, EncryptedRecoveryShare, RecoveryId, RecoveryRequest,
    SignedBackupRequest,
};
use common::config::SocialConfig;
use common::db::{
    BackupKeyPrefix, DecryptionShareId, DecryptionSharePrefix, RecoveryPrefix,
    UsedDoubleEncryptedData, UsedDoubleEncryptedDataPrefix,
};

#[derive(Clone, Debug)]
pub struct FediSocialGen;

impl ExtendsCommonModuleGen for FediSocialGen {
    type Common = FediSocialCommonGen;
}

#[async_trait]
impl ServerModuleGen for FediSocialGen {
    const DATABASE_VERSION: DatabaseVersion = DatabaseVersion(0);

    fn versions(&self, _core: CoreConsensusVersion) -> &[ModuleConsensusVersion] {
        &[ModuleConsensusVersion(0)]
    }

    async fn init(
        &self,
        cfg: ServerModuleConfig,
        _db: Database,
        _env: &BTreeMap<OsString, OsString>,
        _task_group: &mut TaskGroup,
    ) -> anyhow::Result<DynServerModule> {
        Ok(FediSocial {
            cfg: cfg.to_typed()?,
        }
        .into())
    }
    fn trusted_dealer_gen(
        &self,
        peers: &[PeerId],
        _params: &ConfigGenModuleParams,
    ) -> BTreeMap<PeerId, ServerModuleConfig> {
        let sks = threshold_crypto::SecretKeySet::random(peers.degree(), &mut OsRng);
        let pks = sks.public_keys();

        let server_cfg = peers.iter().map(|&peer| {
            let sk = sks.secret_key_share(peer.to_usize());

            (
                peer,
                SocialConfig {
                    private: SocialPrivateConfig {
                        sk_share: threshold_crypto::serde_impl::SerdeSecret(sk),
                    },
                    consensus: FediSocialConsensusConfig {
                        threshold: u32::try_from(peers.threshold()).expect("must not fail"),
                        pk_set: pks.clone(),
                    },
                }
                .to_erased(),
            )
        });

        server_cfg.into_iter().map(|(k, v)| (k, v)).collect()
    }

    async fn distributed_gen(
        &self,
        peers: &PeerHandle,
        _params: &ConfigGenModuleParams,
    ) -> DkgResult<ServerModuleConfig> {
        let g1 = peers.run_dkg_g1(()).await?;

        let ThresholdKeys {
            public_key_set,
            secret_key_share,
        } = g1[&()].threshold_crypto();

        let server = SocialConfig {
            private: SocialPrivateConfig {
                sk_share: secret_key_share,
            },
            consensus: FediSocialConsensusConfig {
                pk_set: public_key_set,
                threshold: u32::try_from(peers.peer_ids().threshold()).expect("must not fail"),
            },
        };

        Ok(server.to_erased())
    }

    fn get_client_config(
        &self,
        config: &ServerModuleConsensusConfig,
    ) -> anyhow::Result<ClientModuleConfig> {
        Ok(FediSocialConsensusConfig::from_erased(config)?.to_client_config())
    }

    // fn to_config_response(
    //     &self,
    //     config: serde_json::Value,
    // ) -> anyhow::Result<ModuleConfigResponse> {
    //     let config = serde_json::from_value::<FediSocialConsensusConfig>(config)?;

    //     Ok(ModuleConfigResponse {
    //         client: config.to_client_config(),
    //         consensus_hash: config.consensus_hash(),
    //     })
    // }

    fn validate_config(&self, identity: &PeerId, config: ServerModuleConfig) -> anyhow::Result<()> {
        config.to_typed::<SocialConfig>()?.validate_config(identity)
    }

    async fn dump_database(
        &self,
        dbtx: &mut ModuleDatabaseTransaction<'_, ModuleInstanceId>,
        prefix_names: Vec<String>,
    ) -> Box<dyn Iterator<Item = (String, Box<dyn erased_serde::Serialize + Send>)> + '_> {
        let mut social: BTreeMap<String, Box<dyn erased_serde::Serialize + Send>> = BTreeMap::new();
        let filtered_prefixes = DbKeyPrefix::iter().filter(|f| {
            prefix_names.is_empty() || prefix_names.contains(&f.to_string().to_lowercase())
        });

        for table in filtered_prefixes {
            match table {
                DbKeyPrefix::Backup => {
                    push_db_pair_items!(
                        dbtx,
                        BackupKeyPrefix,
                        BackupId,
                        BackupRequest,
                        social,
                        "Social Backup"
                    );
                }
                DbKeyPrefix::Recovery => {
                    push_db_pair_items!(
                        dbtx,
                        RecoveryPrefix,
                        RecoveryId,
                        RecoveryRequest,
                        social,
                        "Social Recovery Request"
                    );
                }
                DbKeyPrefix::UsedBackupCiphertext => {
                    push_db_pair_items!(
                        dbtx,
                        UsedDoubleEncryptedDataPrefix,
                        UsedDoubleEncryptedData,
                        BackupId,
                        social,
                        "Used Backup Ciphertext"
                    );
                }
                DbKeyPrefix::DecryptionShare => {
                    push_db_pair_items!(
                        dbtx,
                        DecryptionSharePrefix,
                        DecryptionShareId,
                        EncryptedRecoveryShare,
                        social,
                        "Encrypted recovery share"
                    );
                }
            }
        }

        Box::new(social.into_iter())
    }
}

/// Federated mint member mint
#[derive(Debug)]
pub struct FediSocial {
    pub cfg: SocialConfig,
}

#[async_trait]
impl ServerModule for FediSocial {
    type Common = FediSocialModuleTypes;
    type Gen = FediSocialGen;
    type VerificationCache = FediSocialVerificationCache;

    fn supported_api_versions(&self) -> SupportedModuleApiVersions {
        SupportedModuleApiVersions::from_raw(0, 0, &[(0, 0)])
    }

    async fn await_consensus_proposal<'a>(
        &'a self,
        dbtx: &mut ModuleDatabaseTransaction<'_, ModuleInstanceId>,
    ) {
        if !self.consensus_proposal(dbtx).await.forces_new_epoch() {
            std::future::pending().await
        }
    }

    async fn consensus_proposal<'a>(
        &'a self,
        _dbtx: &mut ModuleDatabaseTransaction<'_, ModuleInstanceId>,
    ) -> ConsensusProposal<FediSocialConsensusItem> {
        ConsensusProposal::new_auto_trigger(vec![])
    }

    async fn begin_consensus_epoch<'a, 'b>(
        &'a self,
        _dbtx: &mut ModuleDatabaseTransaction<'b, ModuleInstanceId>,
        _consensus_items: Vec<(PeerId, FediSocialConsensusItem)>,
        _consensu_peers: &BTreeSet<PeerId>,
    ) -> Vec<PeerId> {
        Default::default()
    }

    fn build_verification_cache<'a>(
        &'a self,
        _inputs: impl Iterator<Item = &'a FediSocialInput> + Send,
    ) -> Self::VerificationCache {
        FediSocialVerificationCache
    }

    async fn validate_input<'a, 'b>(
        &self,
        _interconnect: &dyn ModuleInterconect,
        _dbtx: &mut ModuleDatabaseTransaction<'b, ModuleInstanceId>,
        _verification_cache: &Self::VerificationCache,
        _input: &'a FediSocialInput,
    ) -> Result<InputMeta, ModuleError> {
        unimplemented!();
    }

    async fn apply_input<'a, 'b, 'c>(
        &'a self,
        _interconnect: &'a dyn ModuleInterconect,
        _dbtx: &mut ModuleDatabaseTransaction<'c, ModuleInstanceId>,
        _input: &'b FediSocialInput,
        _cache: &Self::VerificationCache,
    ) -> Result<InputMeta, ModuleError> {
        unimplemented!();
    }

    async fn validate_output(
        &self,
        _dbtx: &mut ModuleDatabaseTransaction<'_, ModuleInstanceId>,
        _output: &FediSocialOutput,
    ) -> Result<TransactionItemAmount, ModuleError> {
        unimplemented!();
    }

    async fn apply_output<'a, 'b>(
        &'a self,
        _dbtx: &mut ModuleDatabaseTransaction<'b, ModuleInstanceId>,
        _output: &'a FediSocialOutput,
        _out_point: OutPoint,
    ) -> Result<TransactionItemAmount, ModuleError> {
        unimplemented!();
    }

    async fn end_consensus_epoch<'a, 'b>(
        &'a self,
        _consensus_peers: &BTreeSet<PeerId>,
        _dbtx: &mut ModuleDatabaseTransaction<'b, ModuleInstanceId>,
    ) -> Vec<PeerId> {
        Default::default()
    }

    async fn output_status(
        &self,
        _dbtx: &mut ModuleDatabaseTransaction<'_, ModuleInstanceId>,
        _out_point: OutPoint,
    ) -> Option<FediSocialOutputOutcome> {
        None
    }

    async fn audit(
        &self,
        _dbtx: &mut ModuleDatabaseTransaction<'_, ModuleInstanceId>,
        _audit: &mut Audit,
    ) {
    }

    fn api_endpoints(&self) -> Vec<ApiEndpoint<Self>> {
        vec![
            // user's call to make a backup (usually when creating the account)
            api_endpoint! {
                "/backup",
                async |module: &FediSocial, context, request: SignedBackupRequest| -> () {
                        module
                            .handle_backup(&mut context.dbtx(), request).await?;
                        Ok(())
                }
            },
            // user's call to initiate the recovery process
            api_endpoint! {
                "/recover",
                async |module: &FediSocial, context, request: SignedRecoveryRequest| -> () {
                        module
                            .handle_recover(&mut context.dbtx(), request).await?;
                        Ok(())
                }
            },
            // guardian's call to download verification document
            api_endpoint! {
                "/get_verification",
                async |module: &FediSocial, context, request: RecoveryId| -> Option<VerificationDocument> {
                        module
                            .handle_get_verification(&mut context.dbtx(), request).await
                }
            },
            // guardian's call to approve the recovery and produce decryption share
            api_endpoint! {
                "/approve_recovery",
                async |module: &FediSocial, context, req: (RecoveryId, String)| -> () {
                        module
                            .handle_approve_recovery(&mut context.dbtx(), req.0, req.1).await?;
                        Ok(())
                }
            },
            api_endpoint! {
                "/decryption_share",
                async |module: &FediSocial, context, request: RecoveryId| -> Option<EncryptedRecoveryShare> {
                        module
                            .handle_get_decryption_share(&mut context.dbtx(), request).await
                }
            },
        ]
    }
}

impl FediSocial {
    /// Constructs a new mint
    ///
    /// # Panics
    /// * If there are no amount tiers
    /// * If the amount tiers for secret and public keys are inconsistent
    /// * If the pub key belonging to the secret key share is not in the pub key
    ///   list.
    pub fn new(cfg: SocialConfig) -> FediSocial {
        FediSocial { cfg }
    }

    pub async fn handle_backup(
        &self,
        dbtx: &mut ModuleDatabaseTransaction<'_, ModuleInstanceId>,
        request: SignedBackupRequest,
    ) -> Result<(), ApiError> {
        let request = request
            .verify_valid(SECP256K1)
            .map_err(|_| ApiError::bad_request("invalid request: signature invalid".into()))?;

        debug!(id = %request.id, "Received social backup request");
        if let Some(prev) = dbtx.get_value(&request.id).await {
            if &prev == request {
                // if we already have exactly same backup request, just return OK, so this call
                // is idempotent
                return Ok(());
            } else if request.timestamp <= prev.timestamp {
                return Err(ApiError::bad_request(
                    "invalid request: newer backup already stored".into(),
                ));
            }
        }

        if let Some(_prev) = dbtx
            .get_value(&UsedDoubleEncryptedData(
                request.double_encrypted_seed.clone(),
            ))
            .await
        {
            return Err(ApiError::bad_request(
                "invalid request: seed already used".into(),
            ));
        }

        info!(id = %request.id, "Storing new user social backup");
        dbtx.insert_entry(&request.id, request).await;

        dbtx.insert_entry(
            &UsedDoubleEncryptedData(request.double_encrypted_seed.clone()),
            &request.id,
        )
        .await;

        Ok(())
    }

    pub async fn handle_recover(
        &self,
        dbtx: &mut ModuleDatabaseTransaction<'_, ModuleInstanceId>,
        request: SignedRecoveryRequest,
    ) -> Result<(), ApiError> {
        let request = request
            .verify_valid(SECP256K1)
            .map_err(|_| ApiError::bad_request("invalid request: signature invalid".into()))?;

        debug!(id = %request.id, "Received social recovery request");

        let Some(backup) = dbtx
            .get_value(&BackupId(request.id.0))
            .await else {
                return Err(ApiError::bad_request(
                    "invalid request: backup id not found".into(),
                ));
        };

        if request.verification_doc.id() != backup.verification_doc_hash {
            return Err(ApiError::bad_request(
                "invalid request: verification document does not match".into(),
            ));
        }

        if let Some(prev) = dbtx.get_value(&request.id).await {
            if &prev == request {
                // same request we have, return Ok to make call idempotent
                return Ok(());
            } else if request.timestamp <= prev.timestamp {
                return Err(ApiError::bad_request(
                    "invalid request: existing recovery already in progress".into(),
                ));
            }
        };

        // TODO: any limits w.r.t social recovery document size? Possibly enforce in the
        // type itself.
        info!(id = %request.id, "Storing user recovery");
        dbtx.insert_entry(&request.id, request).await;

        Ok(())
    }

    pub async fn handle_get_verification(
        &self,
        dbtx: &mut ModuleDatabaseTransaction<'_, ModuleInstanceId>,
        request: RecoveryId,
    ) -> Result<Option<VerificationDocument>, ApiError> {
        debug!(id = %request.0, "Received social recovery verification document request");

        // TODO: guardian auth needed here

        let Some(recovery) = dbtx
            .get_value(&request)
            .await
             else {
                return Ok(None);
        };

        Ok(Some(recovery.verification_doc))
    }

    pub async fn handle_approve_recovery(
        &self,
        dbtx: &mut ModuleDatabaseTransaction<'_, ModuleInstanceId>,
        request: RecoveryId,
        req_admin_pass: String,
    ) -> Result<VerificationDocument, ApiError> {
        debug!(id = %request.0, "Received social recovery approval");

        let env_admin_password = if let Ok(pass) = std::env::var("FM_ADMIN_PASSWORD") {
            pass
        } else {
            return Err(ApiError::bad_request(
                "admin interface configuration error".into(),
            ));
        };

        if env_admin_password.is_empty() {
            return Err(ApiError::bad_request("admin interface not enabled".into()));
        }
        if req_admin_pass != env_admin_password {
            return Err(ApiError::bad_request("unauthorized".into()));
        }

        let Some(recovery) = dbtx
            .get_value(&RecoveryId(request.0))
            .await
             else {
                return Err(ApiError::bad_request(
                    "invalid request: recovery id not found".into(),
                ));
        };

        let Some(backup) = dbtx
            .get_value(&BackupId(request.0))
            .await
             else {
                return Err(ApiError::bad_request(
                    "invalid request: backup id not found".into(),
                ));
        };

        info!(id = %request.0, "Creating social recovery decryption key");
        let decryption_share = self
            .cfg
            .private
            .sk_share
            .decrypt_share(&backup.double_encrypted_seed.0)
            .ok_or_else(|| {
                ApiError::bad_request("invalid request: can't create decryption share".into())
            })?;

        let encrypted_decryption_share = EncryptedRecoveryShare::encrypt_to_ephmeral(
            decryption_share,
            &recovery.recovery_session_encryption_key.0,
        );

        dbtx.insert_entry(&DecryptionShareId(request.0), &encrypted_decryption_share)
            .await;

        Ok(recovery.verification_doc)
    }

    pub async fn handle_get_decryption_share(
        &self,
        dbtx: &mut ModuleDatabaseTransaction<'_, ModuleInstanceId>,
        request: RecoveryId,
    ) -> Result<Option<EncryptedRecoveryShare>, ApiError> {
        info!(id = %request.0, "Requested encrypted decryption share");

        Ok(dbtx.get_value(&DecryptionShareId(request.0)).await)
    }
}

#[derive(Debug, Clone)]
pub struct FediSocialVerificationCache;

impl fedimint_core::server::VerificationCache for FediSocialVerificationCache {}
