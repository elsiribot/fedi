#![allow(dead_code)]

#[cfg(test)]
wasm_bindgen_test::wasm_bindgen_test_configure!(run_in_browser);

use anyhow::Result;

use fediffi::fedimint_core::db::{IDatabase, IDatabaseTransaction, PrefixStream};
use fediffi::fedimint_core::{apply, async_trait_maybe_send};
use rexie::TransactionMode;
use wasm_bindgen::JsCast;

fn rexie_to_anyhow(e: rexie::Error) -> anyhow::Error {
    anyhow::anyhow!(e.to_string())
}

pub struct WebTx {
    tx: rexie::Transaction,
}

pub struct WebDb {
    db: rexie::Rexie,
}

impl WebDb {
    pub async fn new(name: &str) -> Result<Self> {
        Ok(Self {
            db: rexie::Rexie::builder(name)
                .add_object_store(rexie::ObjectStore::new("default"))
                .build()
                .await
                .map_err(rexie_to_anyhow)?,
        })
    }
}

impl std::fmt::Debug for WebDb {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("WebDb").finish_non_exhaustive()
    }
}

#[apply(async_trait_maybe_send!)]
impl IDatabase for WebDb {
    async fn begin_transaction<'a>(&'a self) -> Box<dyn IDatabaseTransaction<'a>> {
        let tx = self
            .db
            .transaction(&["default"], TransactionMode::ReadWrite)
            .unwrap();
        Box::new(WebTx { tx })
    }
}

#[apply(async_trait_maybe_send!)]
impl IDatabaseTransaction<'_> for WebTx {
    async fn raw_insert_bytes(&mut self, key: &[u8], value: Vec<u8>) -> Result<Option<Vec<u8>>> {
        let key = js_sys::Uint8Array::from(key);
        let value = js_sys::Uint8Array::from(&value[..]);
        let store = self.tx.store("default").map_err(rexie_to_anyhow)?;
        let old_value = store.get(&key).await.map_err(rexie_to_anyhow)?;
        store
            .put(&value, Some(&key))
            .await
            .map_err(rexie_to_anyhow)?;
        if old_value.is_undefined() {
            Ok(None)
        } else {
            Ok(Some(
                old_value.dyn_into::<js_sys::Uint8Array>().unwrap().to_vec(),
            ))
        }
    }

    async fn raw_get_bytes(&mut self, key: &[u8]) -> Result<Option<Vec<u8>>> {
        let key = js_sys::Uint8Array::from(key);
        let store = self.tx.store("default").map_err(rexie_to_anyhow)?;
        let result = store.get(&key).await.map_err(rexie_to_anyhow)?;
        if result.is_undefined() {
            Ok(None)
        } else {
            Ok(Some(
                result.dyn_into::<js_sys::Uint8Array>().unwrap().to_vec(),
            ))
        }
    }

    async fn raw_remove_entry(&mut self, key: &[u8]) -> Result<Option<Vec<u8>>> {
        let store = self.tx.store("default").map_err(rexie_to_anyhow)?;
        let key = js_sys::Uint8Array::from(key);
        let old_value = store.get(&key).await.map_err(rexie_to_anyhow)?;
        store.delete(&key).await.map_err(rexie_to_anyhow)?;
        if old_value.is_undefined() {
            Ok(None)
        } else {
            Ok(Some(
                old_value.dyn_into::<js_sys::Uint8Array>().unwrap().to_vec(),
            ))
        }
    }

    async fn raw_find_by_prefix(&mut self, key_prefix: &[u8]) -> PrefixStream<'_> {
        let mut key_prefix_end = key_prefix.to_vec();
        key_prefix_end.last_mut().map(|b| *b += 1);
        let range = if key_prefix.is_empty() {
            None
        } else {
            let lower = js_sys::Uint8Array::from(key_prefix);
            let upper = js_sys::Uint8Array::from(&key_prefix_end[..]);
            Some(rexie::KeyRange::bound(&lower, &upper, false, true).unwrap())
        };
        let store = self.tx.store("default").unwrap();
        let entries = store
            .get_all(range.as_ref(), None, None, None)
            .await
            .unwrap();
        let iter = entries.into_iter().map(|(key, value)| {
            (
                js_sys::Uint8Array::new(&key).to_vec(),
                value.dyn_into::<js_sys::Uint8Array>().unwrap().to_vec(),
            )
        });

        Box::pin(Box::new(futures::stream::iter(iter)))
    }

    async fn commit_tx(self: Box<Self>) -> Result<()> {
        self.tx.commit().await.map_err(rexie_to_anyhow)
    }

    async fn rollback_tx_to_savepoint(&mut self) {
        // self.db.abort().await.unwrap()
        // todo!()
    }

    async fn set_tx_savepoint(&mut self) {
        // todo!()
    }
}

#[cfg(test)]
mod tests {
    use fedimint_api::module::registry::ModuleDecoderRegistry;
    use wasm_bindgen_test::wasm_bindgen_test;

    use crate::WebDb;

    macro_rules! db_test {
        ($name:ident) => {
            #[wasm_bindgen_test]
            pub async fn $name () {
                let db = WebDb::new(stringify!($name)).await.unwrap();
                let db = fedimint_api::db::Database::new(db, ModuleDecoderRegistry::default());
                fedimint_api::db::tests::$name(db).await
            }
        }
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
