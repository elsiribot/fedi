use std::collections::BTreeMap;

use fedimint_client::db::{MetaFieldPrefix, MetaServiceInfoKey};
use fedimint_client::meta::MetaService;
use fedimint_core::db::{Database, IDatabaseTransactionOpsCoreTyped};
use fedimint_core::{apply, async_trait_maybe_send};
use futures::StreamExt;

pub type MetaEntries = BTreeMap<String, String>;

#[apply(async_trait_maybe_send)]
pub trait MetaServiceExt {
    async fn entries_from_db(&self, db: &Database) -> Option<MetaEntries>;
}

#[apply(async_trait_maybe_send)]
impl MetaServiceExt for MetaService {
    /// Retrieve all meta entries from the database
    async fn entries_from_db(&self, db: &Database) -> Option<MetaEntries> {
        let dbtx = &mut db.begin_transaction_nc().await;
        let info = dbtx.get_value(&MetaServiceInfoKey).await;
        #[allow(clippy::question_mark)] // more readable
        if info.is_none() {
            return None;
        }
        let entries: MetaEntries = dbtx
            .find_by_prefix(&MetaFieldPrefix)
            .await
            .map(|(k, v)| (k.0, v.0))
            .collect()
            .await;
        Some(entries)
    }
}
