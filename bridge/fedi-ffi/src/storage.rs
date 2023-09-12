use fedimint_core::config::FederationId;
use fedimint_core::db::IDatabase;
use fedimint_core::task::{MaybeSend, MaybeSync};
use fedimint_core::{apply, async_trait_maybe_send};
use std::path::{Path, PathBuf};
use std::sync::Arc;

#[apply(async_trait_maybe_send!)]
pub trait IStorage: 'static + MaybeSend + MaybeSync {
    /// Database to store all federation joined
    async fn global_database_v0(&self) -> anyhow::Result<fedimint_core_v0::db::Database>;
    // Dpc proposed alternative: open_federation_db(federation_id) which just tries each version in descending order
    async fn federation_idb(&self, db_name: &str) -> anyhow::Result<Box<dyn IDatabase>>;
    /// FIXME: can I get rid of this?
    async fn federation_database_v0(
        &self,
        id: &fedimint_core_v0::config::FederationId,
    ) -> anyhow::Result<fedimint_core_v0::db::Database>;
    async fn federation_idb_v0(
        &self,
        id: &fedimint_core_v0::config::FederationId,
    ) -> anyhow::Result<Box<dyn fedimint_core_v0::db::IDatabase>>;
    async fn delete_federation_db(&self, db_name: &str) -> anyhow::Result<()>;
    async fn read_file(&self, path: &Path) -> anyhow::Result<Vec<u8>>;
    async fn write_file(&self, path: &Path, data: Vec<u8>) -> anyhow::Result<()>;
    /// convert a relative path to a path understood by the platform.
    fn platform_path(&self, path: &Path) -> PathBuf;
}

pub type Storage = Arc<dyn IStorage>;
