use fedimint_core::config::FederationId;
use fedimint_core::db::Database;
use fedimint_core::encoding::{Decodable, Encodable};
use fedimint_core::task::{MaybeSend, MaybeSync};
use fedimint_core::{apply, async_trait_maybe_send};
use std::path::{Path, PathBuf};
use std::sync::Arc;

#[apply(async_trait_maybe_send!)]
pub trait IStorage: 'static + MaybeSend + MaybeSync {
    /// Database to store all federation joined
    async fn global_db(&self) -> anyhow::Result<Database>;
    async fn federation_db(&self, id: &FederationId) -> anyhow::Result<Database>;
    async fn delete_federation_db(&self, id: &FederationId) -> anyhow::Result<()>;
    async fn read_file(&self, path: &Path) -> anyhow::Result<Vec<u8>>;
    async fn write_file(&self, path: &Path, data: Vec<u8>) -> anyhow::Result<()>;
    /// convert a relative path to a path understood by the platform.
    fn platform_path(&self, path: &Path) -> PathBuf;
}

pub type Storage = Arc<dyn IStorage>;

#[repr(u8)]
enum BridgeDbPrefix {
    JoinedFederations = 0xa0,
    ClientConfig = 0xa1,
}

#[derive(Debug, Decodable, Encodable)]
pub struct JoinedFederationsKey;

#[derive(Clone, Debug, Decodable, Encodable)]
pub struct JoinedFederationsPrefix;

impl fedimint_core::db::DatabaseRecord for JoinedFederationsKey {
    const DB_PREFIX: u8 = BridgeDbPrefix::JoinedFederations as u8;
    type Key = Self;
    type Value = FederationId;
}

impl fedimint_core::db::DatabaseRecord for JoinedFederationsPrefix {
    const DB_PREFIX: u8 = BridgeDbPrefix::JoinedFederations as u8;
    type Key = JoinedFederationsKey;
    type Value = FederationId;
}

#[derive(Debug, Decodable, Encodable)]
pub struct FediClientConfigKey;

impl fedimint_core::db::DatabaseRecord for FediClientConfigKey {
    const DB_PREFIX: u8 = BridgeDbPrefix::ClientConfig as u8;
    type Key = Self;
    type Value = String;
}
