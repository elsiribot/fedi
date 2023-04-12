///! Uses immutable data structures and backups to indexeddb on save
use std::fmt::Debug;

use anyhow::Result;
use fediffi::fedimint_core;
use fedimint_core::{apply, async_trait_maybe_send};
use futures::stream;

use tracing::info;
use fediffi::tokio::sync::Mutex;
use fedimint_core::db::{IDatabase, ISingleUseDatabaseTransaction, SingleUseDatabaseTransaction, IDatabaseTransaction, PrefixStream};
use imbl::OrdMap;
use rexie::{Rexie, TransactionMode};
use wasm_bindgen::JsCast;

fn rexie_to_anyhow(e: rexie::Error) -> anyhow::Error {
    anyhow::anyhow!(e.to_string())
}

#[derive(Debug, Default)]
pub struct DatabaseInsertOperation {
    pub key: Vec<u8>,
    pub value: Vec<u8>,
}

#[derive(Debug, Default)]
pub struct DatabaseDeleteOperation {
    pub key: Vec<u8>,
}

#[derive(Debug)]
pub enum DatabaseOperation {
    Insert(DatabaseInsertOperation),
    Delete(DatabaseDeleteOperation),
}

pub struct MemDatabase {
    data: Mutex<OrdMap<Vec<u8>, Vec<u8>>>,
    idb: Rexie,
}

impl Debug for MemDatabase {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("MemDatabase").finish_non_exhaustive()
    }
}

#[derive(Debug)]
pub struct MemTransaction<'a> {
    operations: Vec<DatabaseOperation>,
    tx_data: OrdMap<Vec<u8>, Vec<u8>>,
    db: &'a MemDatabase,
    savepoint: OrdMap<Vec<u8>, Vec<u8>>,
    num_pending_operations: usize,
    num_savepoint_operations: usize,
}

impl MemDatabase {
    pub async fn new(name: &str) -> Result<Self> {
        let idb = rexie::Rexie::builder(name)
                .add_object_store(rexie::ObjectStore::new("default"))
                .build()
                .await
                .map_err(rexie_to_anyhow)?;
        let mut data = OrdMap::new();

        let idb_tx = idb
            .transaction(&["default"], TransactionMode::ReadWrite)
            .map_err(rexie_to_anyhow)?;

        let idb_store = idb_tx.store("default").map_err(rexie_to_anyhow)?;
        let entries = idb_store
            .get_all(None, None, None, None)
            .await
            .map_err(rexie_to_anyhow)?;

        for (key, value) in entries {
            let key = js_sys::Uint8Array::new(&key).to_vec();
            let value = value.dyn_into::<js_sys::Uint8Array>().unwrap().to_vec();
            data.insert(key, value);
        }
        Ok(Self {
            data: Mutex::new(data),
            idb
        })
    }
}

#[apply(async_trait_maybe_send!)]
impl IDatabase for MemDatabase {
    async fn begin_transaction<'a>(&'a self) -> Box<dyn ISingleUseDatabaseTransaction<'a>> {
        let db_clone = self.data.lock().await.clone();
        let mut memtx = MemTransaction {
            operations: Vec::new(),
            tx_data: db_clone.clone(),
            db: self,
            savepoint: db_clone,
            num_pending_operations: 0,
            num_savepoint_operations: 0,
        };

        memtx.set_tx_savepoint().await;
        Box::new(SingleUseDatabaseTransaction::new(memtx))
    }
}

// In-memory database transaction should only be used for test code and never
// for production as it doesn't properly implement MVCC
#[apply(async_trait_maybe_send!)]
impl<'a> IDatabaseTransaction<'a> for MemTransaction<'a> {
    async fn raw_insert_bytes(&mut self, key: &[u8], value: Vec<u8>) -> Result<Option<Vec<u8>>> {
        let val = self.raw_get_bytes(key).await;
        // Insert data from copy so we can read our own writes
        self.tx_data.insert(key.to_vec(), value.clone());
        self.operations
            .push(DatabaseOperation::Insert(DatabaseInsertOperation {
                key: key.to_vec(),
                value,
            }));
        self.num_pending_operations += 1;
        val
    }

    async fn raw_get_bytes(&mut self, key: &[u8]) -> Result<Option<Vec<u8>>> {
        Ok(self.tx_data.get(key).cloned())
    }

    async fn raw_remove_entry(&mut self, key: &[u8]) -> Result<Option<Vec<u8>>> {
        // Remove data from copy so we can read our own writes
        let ret = self.tx_data.remove(&key.to_vec());
        self.operations
            .push(DatabaseOperation::Delete(DatabaseDeleteOperation {
                key: key.to_vec(),
            }));
        self.num_pending_operations += 1;
        Ok(ret)
    }

    async fn raw_find_by_prefix(&mut self, key_prefix: &[u8]) -> PrefixStream<'_> {
        let mut data = self
            .tx_data
            .range::<_, Vec<u8>>((key_prefix.to_vec())..)
            .take_while(|(key, _)| key.starts_with(key_prefix))
            .map(|(key, value)| (key.clone(), value.clone()))
            .collect::<Vec<_>>();
        data.reverse();

        Box::pin(stream::iter(data))
    }

    async fn commit_tx(self) -> Result<()> {
        let mut data = self.db.data.lock().await;
        let mut data_new = data.clone();
        let idb_tx = self
            .db
            .idb
            .transaction(&["default"], TransactionMode::ReadWrite)
            .map_err(rexie_to_anyhow)?;

        let idb_store = idb_tx.store("default").map_err(rexie_to_anyhow)?;

        for op in self.operations {
            match op {
                DatabaseOperation::Insert(insert_op) => {
                    let key = js_sys::Uint8Array::from(&insert_op.key[..]);
                    let value = js_sys::Uint8Array::from(&insert_op.value[..]);
                    idb_store
                        .put(&value, Some(&key))
                        .await
                        .map_err(rexie_to_anyhow)?;
                    data_new.insert(insert_op.key, insert_op.value);
                }
                DatabaseOperation::Delete(delete_op) => {
                    let key = js_sys::Uint8Array::from(&delete_op.key[..]);
                    idb_store.delete(&key).await.map_err(rexie_to_anyhow)?;
                    data_new.remove(&delete_op.key);
                }
            }
        }
        idb_tx.commit().await.unwrap();
        // TODO: rollback idb on failure
        // if everything succeeds
        *data = data_new;
        Ok(())
    }

    async fn rollback_tx_to_savepoint(&mut self) {
        self.tx_data = self.savepoint.clone();

        // Remove any pending operations beyond the savepoint
        let removed_ops = self.num_pending_operations - self.num_savepoint_operations;
        for _i in 0..removed_ops {
            self.operations.pop();
        }
    }

    async fn set_tx_savepoint(&mut self) {
        self.savepoint = self.tx_data.clone();
        self.num_savepoint_operations = self.num_pending_operations;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use fedimint_core::module::registry::ModuleDecoderRegistry;
    use wasm_bindgen_test::wasm_bindgen_test;

    macro_rules! db_test {
        ($name:ident) => {
            #[wasm_bindgen_test]
            pub async fn $name() {
                let db = MemDatabase::new(stringify!($name)).await.unwrap();
                let db = fedimint_core::db::Database::new(db, ModuleDecoderRegistry::default());
                fedimint_core::db::$name(db).await
            }
        };
    }

    db_test!(verify_insert_elements);
    db_test!(verify_remove_nonexisting);
    db_test!(verify_remove_existing);
    db_test!(verify_read_own_writes);
    db_test!(verify_prevent_dirty_reads);
    db_test!(verify_find_by_prefix);
    db_test!(verify_commit);
    db_test!(verify_prevent_nonrepeatable_reads);
    db_test!(verify_phantom_entry);
    // db_test!(verify_string_prefix);
    db_test!(verify_remove_by_prefix);
    db_test!(verify_module_prefix);
}
