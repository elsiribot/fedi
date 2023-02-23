use crate::event::IEventSink as EventSink;
use crate::logging;
use crate::storage::{IStorage, Storage};
use crate::FedimintError;
use crate::{event::EventSink, fedimint_initialize_async, fedimint_rpc_async};

use anyhow::Context;
use async_trait::async_trait;
use fedimint_core::db::Database;
use lazy_static::lazy_static;
use mint_client::module_decode_stubs;
use std::sync::Arc;
use tracing::error;

use std::path::{Path, PathBuf};

lazy_static! {
    static ref RUNTIME: tokio::runtime::Runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .expect("failed to build runtime");
}

uniffi_macros::include_scaffolding!("fedi");

#[derive(Clone)]
pub struct PathBasedStorage {
    data_dir: PathBuf,
}

#[async_trait]
impl IStorage for PathBasedStorage {
    async fn global_db(&self) -> anyhow::Result<Database> {
        // using .gdb instead to .db to avoid collision with federation named `global`
        let db_path = self.data_dir.join("global.gdb");

        let db = fedimint_rocksdb::RocksDb::open(db_path)?;
        Ok(Database::new(db, module_decode_stubs()))
    }

    async fn federation_db(&self, name: &str) -> anyhow::Result<Database> {
        let db_path = self.data_dir.join(&format!("{name}.db"));
        let db = fedimint_rocksdb::RocksDb::open(db_path)?;
        Ok(Database::new(db, module_decode_stubs()))
    }

    async fn delete_federation_db(&self, name: &str) -> anyhow::Result<()> {
        let db_path = self.data_dir.join(&format!("{name}.db"));
        std::fs::remove_dir_all(db_path).context("delete federation db")?;
        Ok(())
    }

    async fn read_file(&self, path: &Path) -> anyhow::Result<Vec<u8>> {
        if path.is_absolute() {
            Ok(tokio::fs::read(path).await?)
        } else {
            let path = self.data_dir.join(path);
            Ok(tokio::fs::read(path).await?)
        }
    }

    async fn write_file(&self, path: &Path, data: Vec<u8>) -> anyhow::Result<()> {
        let path = if path.is_absolute() {
            path.to_owned()
        } else {
            self.data_dir.join(path)
        };
        // tokio::fs::write is bad, creates a second copy of data
        Ok(tokio::task::spawn_blocking(move || std::fs::write(path, data)).await??)
    }
}

// TODO: send error message
pub fn fedimint_initialize(data_dir: String, log_level: String, event_sink: Box<dyn EventSink>) {
    RUNTIME.block_on(async {
        let event_sink: Arc<dyn EventSink> = event_sink.into();
        let data_dir: PathBuf = data_dir.into();
        logging::init_logging(&data_dir, event_sink.clone(), &log_level).unwrap();
        let storage = Arc::new(PathBasedStorage { data_dir });
        fedimint_initialize_async(storage, event_sink)
            .await
            .unwrap_or_else(|e| {
                error!("Failed to initialize the bridge: {:?}", e);
            });
    })
}
pub fn fedimint_rpc(method: String, payload: String) -> String {
    RUNTIME.block_on(async move { fedimint_rpc_async(method, payload).await })
}

pub fn fedimint_get_supported_events() -> Vec<String> {
    return vec![
        String::from("federation"),
        String::from("transaction"),
        String::from("socialRecovery"),
        String::from("recoveryFileCreation"),
        String::from("log"),
    ];
}
