use std::fmt;

use fedi_social_client::FediSocialClientGen;
use fedimint_client::module::gen::{ClientModuleGenRegistry, DynClientModuleGen};
use fedimint_derive_secret::DerivableSecret;
use fedimint_ln_client::LightningClientGen;
use fedimint_mint_client::MintClientGen;
use fedimint_wallet_client::WalletClientGen;
pub use mint_client::*;

use fedimint_core::{
    config::ClientConfig,
    db::Database,
    encoding::{Decodable, Encodable},
    module::registry::ModuleDecoderRegistry,
    PeerId,
};

use secp256k1::{All, Secp256k1};
use serde::{Deserialize, Serialize};
// use stabilitypool::PoolClientGen;

mod social;
pub use crate::social::*;

// TODO: Actually implement. Use some bip39 crate instead?
#[derive(Serialize, Deserialize, Encodable, Decodable, PartialEq, Eq, Clone)]
pub struct UserSeedPhrase(pub String);

impl fmt::Debug for UserSeedPhrase {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "UserSeedPhrase([redacted])")
    }
}

impl From<String> for UserSeedPhrase {
    fn from(s: String) -> Self {
        Self(s)
    }
}

impl From<&str> for UserSeedPhrase {
    fn from(s: &str) -> Self {
        Self(s.into())
    }
}

pub struct FediClient<T>(Client<T>);

impl<T> std::ops::Deref for FediClient<T> {
    type Target = Client<T>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<T> FediClient<T>
where
    T: AsRef<ClientConfig> + Clone + Send,
{
    pub async fn new(
        config: T,
        module_gens: ClientModuleGenRegistry,
        decoders: ModuleDecoderRegistry,
        db: Database,
        secp: Secp256k1<All>,
    ) -> Self {
        Self(Client::new(config, decoders, module_gens, db, secp).await)
    }
}

impl<T> FediClient<T> {
    pub fn social_recovery_secret_static(root_secret: &DerivableSecret) -> DerivableSecret {
        assert_eq!(root_secret.level(), 0);
        root_secret.child_key(SOCIAL_RECOVERY_SECRET_CHILD_ID)
    }
}

impl<T: AsRef<ClientConfig> + Clone + Send> FediClient<T> {
    pub fn social_backup(&self) -> SocialBackup {
        let (module_id, cfg) = self
            .config()
            .as_ref()
            .get_first_module_by_kind::<fedi_social_client::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");
        SocialBackup {
            context: self.context().clone(),
            module_secret: Self::social_recovery_secret_static(self.0.root_secret()),
            config: cfg,
            module_id,
        }
    }

    pub fn social_recovery_start(
        &self,
        recovery_file: RecoveryFile,
    ) -> anyhow::Result<SocialRecovery> {
        let (module_id, cfg) = self
            .config()
            .as_ref()
            .get_first_module_by_kind::<fedi_social_client::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");
        SocialRecovery::new_start(module_id, cfg, self.context().clone(), recovery_file)
    }

    pub fn social_recovery_continue(&self, prev_state: SocialRecoveryState) -> SocialRecovery {
        let (module_id, cfg) = self
            .config()
            .as_ref()
            .get_first_module_by_kind::<fedi_social_client::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");
        SocialRecovery::new_continue(module_id, cfg, self.context().clone(), prev_state)
    }

    pub fn social_verification(&self, peer_id: PeerId) -> SocialVerification {
        let (module_id, _cfg) = self
            .config()
            .as_ref()
            .get_first_module_by_kind::<fedi_social_client::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");
        SocialVerification::new(module_id, self.0.context().clone(), peer_id)
    }
}

pub fn module_gens() -> ClientModuleGenRegistry {
    ClientModuleGenRegistry::from(vec![
        DynClientModuleGen::from(WalletClientGen),
        DynClientModuleGen::from(MintClientGen),
        DynClientModuleGen::from(LightningClientGen),
        DynClientModuleGen::from(FediSocialClientGen),
        // DynClientModuleGen::from(PoolClientGen),
    ])
}
