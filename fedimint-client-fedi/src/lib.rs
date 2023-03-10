use std::fmt;

use fedimint_derive_secret::DerivableSecret;
pub use mint_client::*;

use fedimint_core::{
    config::ClientConfig,
    encoding::{Decodable, Encodable},
    PeerId,
};

use serde::{Deserialize, Serialize};

mod social;
pub use crate::social::*;

// TODO: Actually implement. Use some bip39 crate instead?
#[derive(Serialize, Deserialize, Encodable, Decodable, PartialEq, Eq, Clone)]
pub struct UserSeedPhrase(String);

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
            .get_first_module_by_kind::<fedi_social_common::config::FediSocialClientConfig>(
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
            .get_first_module_by_kind::<fedi_social_common::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");
        SocialRecovery::new_start(module_id, cfg, self.context().clone(), recovery_file)
    }

    pub fn social_recovery_continue(&self, prev_state: SocialRecoveryState) -> SocialRecovery {
        let (module_id, cfg) = self
            .config()
            .as_ref()
            .get_first_module_by_kind::<fedi_social_common::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");
        SocialRecovery::new_continue(module_id, cfg, self.context().clone(), prev_state)
    }

    pub fn social_verification(&self, peer_id: PeerId) -> SocialVerification {
        let (module_id, _cfg) = self
            .config()
            .as_ref()
            .get_first_module_by_kind::<fedi_social_common::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");
        SocialVerification::new(module_id, self.0.context().clone(), peer_id)
    }
}
