use nostr_sdk::{secp256k1, Client, EventBuilder, Keys, Kind, Tag, TagKind};
use runtime::bridge_runtime::Runtime;
use runtime::constants::NOSTR_CHILD_ID;
use runtime::features::NostrFeatureCatalog;

pub struct Nostril {
    client: Client,
}

impl Nostril {
    pub async fn new(
        runtime: &Runtime,
        nostr_catalog: &NostrFeatureCatalog,
    ) -> anyhow::Result<Self> {
        let client = Client::new(Self::derive_keys(runtime).await);
        for relay in &nostr_catalog.relays {
            client.add_relay(relay).await?;
        }
        // note: doesn't wait, just connnects in background
        client.connect().await;
        Ok(Self { client })
    }

    async fn derive_keys(runtime: &Runtime) -> Keys {
        let global_root_secret = runtime.app_state.root_secret().await;
        let nostr_secret = global_root_secret.child_key(NOSTR_CHILD_ID);
        let nostr_keypair = nostr_secret.to_secp_key(secp256k1::SECP256K1);
        Keys::new(nostr_sdk::SecretKey::from(nostr_keypair.secret_key()))
    }

    /// Rate a federation
    ///
    /// ref: https://github.com/nostr-protocol/nips/pull/1110/files
    /// ref: https://github.com/MakePrisms/bitcoinmints/issues/22
    pub async fn rate_federation(
        &self,
        federation_id: String,
        rating: u8,
        invite_code: Option<String>,
    ) -> anyhow::Result<()> {
        anyhow::ensure!(rating <= 5, "illegal rating");
        self.client
            .send_event_builder(
                EventBuilder::new(Kind::from_u16(38173), format!("[{rating}/5]"))
                    .tag(Tag::identifier(federation_id))
                    .tag(Tag::custom(TagKind::custom("rating"), [rating.to_string()]))
                    .tags(invite_code.map(|code| Tag::custom(TagKind::u(), [code]))),
            )
            .await?;
        Ok(())
    }
}
