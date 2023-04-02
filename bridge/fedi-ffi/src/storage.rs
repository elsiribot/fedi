use async_trait::async_trait;
use fedimint_core::db::Database;
use fedimint_core::encoding::{Decodable, Encodable};
use std::path::Path;
use std::sync::Arc;

#[async_trait]
pub trait IStorage: 'static + Send + Sync {
    /// Database to store all federation joined
    async fn global_db(&self) -> anyhow::Result<Database>;
    async fn federation_db(&self, name: &str) -> anyhow::Result<Database>;
    async fn delete_federation_db(&self, name: &str) -> anyhow::Result<()>;
    async fn read_file(&self, path: &Path) -> anyhow::Result<Vec<u8>>;
    async fn write_file(&self, path: &Path, data: Vec<u8>) -> anyhow::Result<()>;
}

pub type Storage = Arc<dyn IStorage>;

#[repr(u8)]
enum BridgeDbPrefix {
    JoinedFederations = 0xa0,
    ClientConfig = 0xa1,
}

#[derive(Debug, Decodable, Encodable)]
pub struct JoinedFederationsKey;

#[derive(Debug, Decodable, Encodable)]
pub struct JoinedFederationsPrefix;

impl fedimint_core::db::DatabaseRecord for JoinedFederationsKey {
    const DB_PREFIX: u8 = BridgeDbPrefix::JoinedFederations as u8;
    type Key = Self;
    type Value = String;
}

impl fedimint_core::db::DatabaseRecord for JoinedFederationsPrefix {
    const DB_PREFIX: u8 = BridgeDbPrefix::JoinedFederations as u8;
    type Key = JoinedFederationsKey;
    type Value = String;
}

#[derive(Debug, Decodable, Encodable)]
pub struct FediClientConfigKey;

impl fedimint_core::db::DatabaseRecord for FediClientConfigKey {
    const DB_PREFIX: u8 = BridgeDbPrefix::ClientConfig as u8;
    type Key = Self;
    type Value = String;
}
