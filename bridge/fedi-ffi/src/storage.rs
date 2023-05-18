use fedimint_core::config::FederationId;
use fedimint_core::db::{Database, IDatabase};
use fedimint_core::encoding::{Decodable, Encodable};
use fedimint_core::task::{MaybeSend, MaybeSync};
use fedimint_core::{apply, async_trait_maybe_send, impl_db_lookup, impl_db_record};
use std::path::{Path, PathBuf};
use std::sync::Arc;

#[apply(async_trait_maybe_send!)]
pub trait IStorage: 'static + MaybeSend + MaybeSync {
    /// Database to store all federation joined
    async fn global_db(&self) -> anyhow::Result<Database>;
    async fn federation_db(&self, id: &FederationId) -> anyhow::Result<Box<dyn IDatabase>>;
    async fn delete_federation_db(&self, id: &FederationId) -> anyhow::Result<()>;
    async fn read_file(&self, path: &Path) -> anyhow::Result<Vec<u8>>;
    async fn write_file(&self, path: &Path, data: Vec<u8>) -> anyhow::Result<()>;
    /// convert a relative path to a path understood by the platform.
    fn platform_path(&self, path: &Path) -> PathBuf;
}

pub type Storage = Arc<dyn IStorage>;

#[repr(u8)]
enum BridgeDbPrefix {
    JoinedFederations = 0xb0,
    ClientConfig = 0xb1,
    XmppUsername = 0xb2,
    FederationConnectInfo = 0xb3,
}

#[derive(Debug, Decodable, Encodable)]
pub struct JoinedFederation(pub FederationId);

#[derive(Clone, Debug, Decodable, Encodable)]
pub struct JoinedFederationsPrefix;

impl_db_record!(
    key = JoinedFederation,
    value = (),
    db_prefix = BridgeDbPrefix::JoinedFederations,
);

impl_db_lookup!(
    key = JoinedFederation,
    query_prefix = JoinedFederationsPrefix
);

#[derive(Debug, Decodable, Encodable)]
pub struct FediClientConfigKey;

impl fedimint_core::db::DatabaseRecord for FediClientConfigKey {
    const DB_PREFIX: u8 = BridgeDbPrefix::ClientConfig as u8;
    type Key = Self;
    type Value = String;
}

#[derive(Debug, Decodable, Encodable)]
pub struct XmppUsername;

impl_db_record!(
    key = XmppUsername,
    value = String,
    db_prefix = BridgeDbPrefix::XmppUsername,
);

#[derive(Debug, Decodable, Encodable)]
pub struct FederationConnectInfo;

impl fedimint_core::db::DatabaseRecord for FederationConnectInfo {
    const DB_PREFIX: u8 = BridgeDbPrefix::FederationConnectInfo as u8;
    type Key = Self;
    type Value = String;
}
