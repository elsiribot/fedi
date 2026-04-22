use std::collections::BTreeMap;

use anyhow::{Context, ensure};
use rpc_types::{
    RpcGuardianRemittanceAccountInfo, RpcGuardianRemittanceDashboard,
    RpcGuardianRemittanceDayBucket, RpcGuardianRemittanceModuleTotal,
};
use stability_pool_client::common::{AccountHistoryItemKind, AccountType};
use stability_pool_client::{StabilityPoolHistoryService, StabilityPoolSyncService};
use time::OffsetDateTime;
use tracing::error;

use super::FederationV2;
use super::client::ClientExt;
use crate::fedi_fee::guardian_metadata::decrypt_guardian_remittance_metadata;

pub struct GuardianRemittanceAccount {
    sync_service: StabilityPoolSyncService,
    history_service: StabilityPoolHistoryService,
}

impl GuardianRemittanceAccount {
    pub async fn new(fed: &FederationV2) -> anyhow::Result<Self> {
        let spv2 = fed.client.spv2()?;
        let account_id = spv2.our_account(AccountType::BtcDepositor).id();
        let account = Self {
            sync_service: StabilityPoolSyncService::new(
                spv2.api.clone(),
                spv2.db.clone(),
                account_id,
            )
            .await,
            history_service: StabilityPoolHistoryService::new(
                spv2.client_ctx.clone(),
                spv2.api.clone(),
                account_id,
            ),
        };
        fed.spawn_cancellable("guardian_remittance_sync", |fed| async move {
            let Some(account) = fed.guardian_remittance_account.get() else {
                error!("guardian remittance account missing during sync task");
                return;
            };
            let config = &fed.client.spv2().expect("subsystem init checked").cfg;
            account.sync_service.update_continuously(config).await;
        });
        fed.spawn_cancellable("guardian_remittance_history", |fed| async move {
            let Some(account) = fed.guardian_remittance_account.get() else {
                error!("guardian remittance account missing during history task");
                return;
            };
            account
                .history_service
                .update_continuously(&account.sync_service)
                .await;
        });
        Ok(account)
    }

    pub fn account_info(
        &self,
        fed: &FederationV2,
    ) -> anyhow::Result<RpcGuardianRemittanceAccountInfo> {
        let spv2 = fed.client.spv2()?;
        let account = spv2.our_account(AccountType::BtcDepositor);
        Ok(RpcGuardianRemittanceAccountInfo {
            serialized_account: serde_json::to_string(&account)?,
        })
    }

    pub async fn dashboard(
        &self,
        fed: &FederationV2,
    ) -> anyhow::Result<RpcGuardianRemittanceDashboard> {
        let balance_sats = self.current_balance_sats(fed).await?;
        let raw_entries = self.raw_entries(fed).await?;
        let day_buckets = aggregate_day_buckets(raw_entries)?;

        Ok(RpcGuardianRemittanceDashboard {
            current_balance_sats: balance_sats,
            day_buckets,
        })
    }

    async fn current_balance_sats(&self, _fed: &FederationV2) -> anyhow::Result<u64> {
        let total_msats = self
            .sync_service
            .current_sync_response()
            .map(|sync| {
                sync.value.idle_balance.msats
                    + sync.value.staged_balance.msats
                    + sync.value.locked_balance.msats
            })
            .unwrap_or(0);
        Ok(msats_to_sats(total_msats))
    }

    async fn raw_entries(
        &self,
        fed: &FederationV2,
    ) -> anyhow::Result<Vec<GuardianRemittanceEntry>> {
        let history = self.history_service.get_full_account_history().await?;
        let spv2 = fed.client.spv2()?;
        let guardian_key = spv2.our_keypair(AccountType::BtcDepositor);

        history
            .into_iter()
            .filter_map(|item| {
                let metadata = match item.kind {
                    AccountHistoryItemKind::DepositToBtcBalance { metadata } => metadata.0,
                    _ => return None,
                };
                Some((item.txid, item.amount, metadata))
            })
            .map(|(txid, amount, metadata)| {
                let metadata = decrypt_guardian_remittance_metadata(&guardian_key, &metadata)
                    .with_context(|| format!("failed to decrypt guardian remittance tx {txid}"))?;
                ensure!(
                    metadata.total_msats == amount.msats,
                    "guardian remittance tx {txid} metadata amount mismatch"
                );

                let module_totals = metadata.breakdown.into_iter().fold(
                    BTreeMap::<String, u64>::new(),
                    |mut acc, part| {
                        *acc.entry(part.module).or_default() += msats_to_sats(part.amount_msats);
                        acc
                    },
                );

                Ok(GuardianRemittanceEntry {
                    remitted_at_unix: metadata.remitted_at_unix,
                    total_sats: msats_to_sats(metadata.total_msats),
                    module_totals,
                })
            })
            .collect()
    }
}

#[derive(Debug, Clone)]
struct GuardianRemittanceEntry {
    remitted_at_unix: u64,
    total_sats: u64,
    module_totals: BTreeMap<String, u64>,
}

fn aggregate_day_buckets(
    entries: Vec<GuardianRemittanceEntry>,
) -> anyhow::Result<Vec<RpcGuardianRemittanceDayBucket>> {
    let mut buckets = BTreeMap::<String, RpcGuardianRemittanceDayBucket>::new();

    for entry in entries {
        let day_key = utc_day_key(entry.remitted_at_unix)?;
        let bucket =
            buckets
                .entry(day_key.clone())
                .or_insert_with(|| RpcGuardianRemittanceDayBucket {
                    day_key,
                    total_sats_remitted: 0,
                    remittance_count: 0,
                    module_totals: Vec::new(),
                });
        bucket.total_sats_remitted += entry.total_sats;
        bucket.remittance_count += 1;

        let mut module_totals = bucket
            .module_totals
            .iter()
            .map(|item| (item.module.clone(), item.total_sats))
            .collect::<BTreeMap<_, _>>();
        for (module, total_sats) in entry.module_totals {
            *module_totals.entry(module).or_default() += total_sats;
        }
        bucket.module_totals = module_totals
            .into_iter()
            .map(|(module, total_sats)| RpcGuardianRemittanceModuleTotal { module, total_sats })
            .collect();
    }

    Ok(buckets.into_values().rev().collect())
}

fn utc_day_key(unix_seconds: u64) -> anyhow::Result<String> {
    let dt = OffsetDateTime::from_unix_timestamp(
        i64::try_from(unix_seconds).context("guardian remittance timestamp overflow")?,
    )?;
    let date = dt.date();
    Ok(format!(
        "{:04}-{:02}-{:02}",
        date.year(),
        u8::from(date.month()),
        date.day()
    ))
}

fn msats_to_sats(msats: u64) -> u64 {
    msats / 1000
}

#[cfg(test)]
mod tests {
    use bitcoin::secp256k1;
    use bitcoin::secp256k1::ecdh::SharedSecret;
    use fedimint_aead::LessSafeKey;
    use fedimint_core::core::ModuleKind;
    use fedimint_derive_secret::{ChildId, DerivableSecret};
    use rpc_types::RpcTransactionDirection;

    use super::*;
    use crate::fedi_fee::guardian_metadata::{
        GuardianFeeBreakdownItemV1, GuardianFeeRemittanceCiphertextV1,
        GuardianFeeRemittanceMetadataV1,
    };

    const TEST_CHILD_ID: ChildId = ChildId(0);

    #[test]
    fn decrypts_guardian_remittance_metadata() {
        let guardian_key = DerivableSecret::new_root(&[3; 32], b"guardian-test-root")
            .child_key(TEST_CHILD_ID)
            .to_secp_key(secp256k1::SECP256K1);
        let plaintext = GuardianFeeRemittanceMetadataV1 {
            version: 1,
            total_msats: 123_000,
            breakdown: vec![GuardianFeeBreakdownItemV1 {
                module: ModuleKind::from_static_str("mint").to_string(),
                direction: RpcTransactionDirection::Receive,
                amount_msats: 123_000,
            }],
            remitted_at_unix: 1_700_000_000,
        };

        let (ephemeral_secret, ephemeral_pubkey) =
            secp256k1::SECP256K1.generate_keypair(&mut rand::thread_rng());
        let shared_secret = SharedSecret::new(&guardian_key.public_key(), &ephemeral_secret);
        let shared_secret = DerivableSecret::new_root(
            &shared_secret.secret_bytes(),
            b"guardian-fee-remittance-ecdh",
        );
        let ciphertext = fedimint_aead::encrypt(
            serde_json::to_vec(&plaintext).expect("plaintext serializes"),
            &LessSafeKey::new(shared_secret.to_chacha20_poly1305_key()),
        )
        .expect("encrypts");
        let envelope = GuardianFeeRemittanceCiphertextV1 {
            version: 1,
            ephemeral_pubkey,
            ciphertext_hex: hex::encode(ciphertext),
        };

        let decrypted = decrypt_guardian_remittance_metadata(
            &guardian_key,
            &serde_json::to_vec(&envelope).expect("envelope serializes"),
        )
        .expect("metadata decrypts");

        assert_eq!(decrypted.total_msats, plaintext.total_msats);
        assert_eq!(decrypted.remitted_at_unix, plaintext.remitted_at_unix);
        assert_eq!(decrypted.breakdown.len(), 1);
        assert_eq!(decrypted.breakdown[0].module, "mint");
    }

    #[test]
    fn aggregates_remittances_by_day_descending() {
        let buckets = aggregate_day_buckets(vec![
            GuardianRemittanceEntry {
                remitted_at_unix: 1_700_086_400,
                total_sats: 5,
                module_totals: BTreeMap::from([("mint".to_string(), 2), ("wallet".to_string(), 3)]),
            },
            GuardianRemittanceEntry {
                remitted_at_unix: 1_700_080_000,
                total_sats: 7,
                module_totals: BTreeMap::from([("mint".to_string(), 7)]),
            },
            GuardianRemittanceEntry {
                remitted_at_unix: 1_699_999_999,
                total_sats: 11,
                module_totals: BTreeMap::from([("lightning".to_string(), 11)]),
            },
        ])
        .expect("aggregates");

        assert_eq!(buckets.len(), 2);
        assert_eq!(buckets[0].day_key, "2023-11-15");
        assert_eq!(buckets[0].total_sats_remitted, 12);
        assert_eq!(buckets[0].remittance_count, 2);
        assert_eq!(
            buckets[0].module_totals,
            vec![
                RpcGuardianRemittanceModuleTotal {
                    module: "mint".to_string(),
                    total_sats: 9,
                },
                RpcGuardianRemittanceModuleTotal {
                    module: "wallet".to_string(),
                    total_sats: 3,
                },
            ]
        );
        assert_eq!(buckets[1].day_key, "2023-11-14");
        assert_eq!(buckets[1].total_sats_remitted, 11);
    }
}
