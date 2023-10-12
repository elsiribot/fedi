use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::vec;

use anyhow::Context;
use bitcoin::{Address, Amount, Txid};
use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tokio::fs::create_dir_all;
use tokio::join;
use tracing::{debug, info};

use crate::remote::{recursive_rsync_from_remote_dir_checked, run_ssh_checked, run_ssh_unchecked};
use crate::{
    new_piped_command, run_parallel, run_sequentially, BitcoinCliArgs, FederationArgs,
    RecoverFundsSubCommand, RecoveryMethodArgs, SshArgs,
};

const FEDERATION_MACHINE_NAMES: [&str; 4] = ["alpha", "bravo", "charlie", "delta"];
const GATEWAY_NAME_BASE: &str = "gateway";

struct Federation {
    name: String,
    gateways: Vec<RemoteHost>,
    fedimints: Vec<RemoteHost>,
}

#[derive(Debug, Clone)]
struct RemoteHost {
    name: String,
    ssh_args: SshArgs,
    creation_date: DateTime<Utc>,
}

pub(super) async fn federation_command(args: FederationArgs) -> anyhow::Result<()> {
    let federation = discover_federation(&args).await?;
    match args.command {
        crate::FederationSubCommand::FundsSummary(args) => funds_summary(args, federation).await,
        crate::FederationSubCommand::RecoverFunds(args) => recover_funds(args, federation).await,
        crate::FederationSubCommand::RestartFedimints(args) => {
            command_restart_fedimints(args, federation).await
        }
        crate::FederationSubCommand::StartFedimints(args) => {
            command_start_fedimints(args, federation).await
        }
        crate::FederationSubCommand::StopFedimints(args) => {
            command_stop_fedimints(args, federation).await
        }
        crate::FederationSubCommand::PauseNpcnix(args) => {
            command_pause_npcnix(args, federation).await
        }
    }
}

async fn discover_federation(args: &FederationArgs) -> anyhow::Result<Federation> {
    let ssh_user = args.ssh_user.as_str();
    let federation_name = args.name.as_str();
    let host_address_suffix = args.host_address_suffix.as_str();

    let gateway = async {
        let result: anyhow::Result<Vec<RemoteHost>> = if args.ignore_gateways {
            Ok(Vec::new())
        } else {
            // FIXME: support multiple gateways
            let gateway = create_remote_host(
                GATEWAY_NAME_BASE.to_owned(),
                SshArgs {
                    destination_host: format!(
                        "{ssh_user}@private.{GATEWAY_NAME_BASE}-{federation_name}.{host_address_suffix}"
                    ),
                    jump_host: args.jump_host.clone(),
                },
            )
            .await?;
            Ok(vec![gateway])
        };
        result
    };
    let fedimints = FEDERATION_MACHINE_NAMES.iter().map(|machine_name| {
        create_remote_host(
            machine_name.to_string(),
            SshArgs {
                destination_host: format!(
                    "{ssh_user}@private.{machine_name}.{federation_name}.{host_address_suffix}"
                ),
                jump_host: args.jump_host.clone(),
            },
        )
    });

    let (gateway, fedimints) = futures::join!(gateway, run_parallel(fedimints));

    Ok(Federation {
        name: federation_name.to_owned(),
        gateways: gateway?,
        fedimints: fedimints.into_iter().collect::<anyhow::Result<Vec<_>>>()?,
    })
}

async fn get_creation_date(ssh_args: &SshArgs) -> anyhow::Result<DateTime<Utc>> {
    // unchecked because we provide many paths that may not exist
    let (_, output) = run_ssh_unchecked(
        ssh_args,
        r#"stat -c "%W" /var/lib/{npcnix,fedimint,lnd,gw-lnd}"#,
    )
    .await?;
    let stdout = std::str::from_utf8(&output.stdout)?.trim();
    let earliest_timestamp = stdout
        .split('\n')
        .filter(|line| !line.is_empty())
        .map(u64::from_str)
        .collect::<Result<Vec<_>, _>>()
        .with_context(|| {
            format!(
                "failed to parse '{stdout}', errors:\n{:?}",
                std::str::from_utf8(&output.stderr)
            )
        })?
        .into_iter()
        .min()
        .with_context(|| {
            format!(
                "no creation timestamps found on this machine {ssh_args:?}, stdout: '{stdout}', errors:\n{:?}",
                std::str::from_utf8(&output.stderr)
            )
        })?;
    let creation_date = DateTime::<Utc>::from_utc(
        NaiveDateTime::from_timestamp_opt(earliest_timestamp.try_into()?, 0).with_context(
            || anyhow::anyhow!("Failed to convert timestamp: {earliest_timestamp}"),
        )?,
        Utc,
    );
    Ok(creation_date)
}
async fn create_remote_host(name: String, ssh_args: SshArgs) -> anyhow::Result<RemoteHost> {
    let creation_date = get_creation_date(&ssh_args).await?;
    Ok(RemoteHost {
        name,
        ssh_args,
        creation_date,
    })
}

#[derive(Debug, Deserialize)]
struct RecoveryToolResult {
    descriptor: Value,
    amount_sat: Option<u64>,
}

#[derive(Debug, Deserialize, PartialEq)]
struct BitcoinBalances {
    trusted: f64,
    untrusted_pending: f64,
    immature: f64,
}

#[derive(Debug, Deserialize)]
struct CreatePsbtResponse {
    psbt: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct ProcessPsbtResponse {
    psbt: String,
    complete: bool,
}

#[derive(Debug, Deserialize, Serialize)]
struct FinalizePsbtResponse {
    hex: String,
    complete: bool,
}

#[derive(Debug, Deserialize)]
struct GatewayCliInfoResponse {
    federations: Vec<GatewayCliInfoFederation>,
}

#[derive(Debug, Deserialize)]
struct GatewayCliInfoFederation {
    federation_id: String,
}

#[derive(Debug, Deserialize)]
struct ListChannelsResponse {
    channels: Vec<ListChannelsResponseChannel>,
}

#[derive(Debug, Deserialize)]
struct ListChannelsResponseChannel {
    local_balance: String,
}

#[derive(Debug, Deserialize)]
struct WalletBalanceResponse {
    total_balance: String,
}

async fn funds_summary(
    args: crate::FundsSummaryArgs,
    federation: Federation,
) -> anyhow::Result<()> {
    let temp_directory = tempfile::tempdir()?;
    let temp_federation_path = temp_directory.path().join(&federation.name);
    let wallet_base_id = Utc::now().timestamp().to_string();

    stop_fedimints(&federation).await?;

    info!("Copying data from fedimints");
    let fedimint_data = copy_directory_from_hosts(
        federation.fedimints.iter().cloned(),
        Path::new("/var/lib/fedimint"),
        &temp_federation_path,
    )
    .await?;

    if args.restart_fedimints {
        info!("Restarting fedimints");
        start_fedimints(&federation).await?;
    }

    let args = &args;

    let (balance_on_descriptors, output_descriptors_utxos, output_descriptors_epochs) =
        match args.recovery_method {
            RecoveryMethodArgs::All => {
                // TODO: we can do this is parallel, but we need two copies of the db due to
                // lock issues
                info!("Extracting descriptors using utxos recovery method");
                let output_descriptors_utxos = extract_all_output_descriptors(
                    &federation,
                    fedimint_data.clone(),
                    args,
                    RecoveryMethod::Utxos,
                )
                .await?;
                info!("Extracting descriptors using epochs recovery method");
                let output_descriptors_epochs = extract_all_output_descriptors(
                    &federation,
                    fedimint_data,
                    args,
                    RecoveryMethod::Epochs,
                )
                .await?;
                let balance = summarize_output_descriptor_balance(&output_descriptors_utxos)?
                    .context("missing amounts in utxos recovery")?;
                info!("The federation balance from recovery tool is: {balance}");
                (
                    Some(balance),
                    Some(output_descriptors_utxos),
                    Some(output_descriptors_epochs),
                )
            }
            RecoveryMethodArgs::Utxos => {
                info!("Extracting descriptors using utxos recovery method");
                let output_descriptors_utxos = extract_all_output_descriptors(
                    &federation,
                    fedimint_data,
                    args,
                    RecoveryMethod::Utxos,
                )
                .await?;
                let balance = summarize_output_descriptor_balance(&output_descriptors_utxos)?
                    .context("missing amounts in utxos recovery")?;
                info!("The federation balance from recovery tool is: {balance}");
                (Some(balance), Some(output_descriptors_utxos), None)
            }
            RecoveryMethodArgs::Epochs => {
                info!("Extracting descriptors using epochs recovery method");
                let output_descriptors_epochs = extract_all_output_descriptors(
                    &federation,
                    fedimint_data,
                    args,
                    RecoveryMethod::Epochs,
                )
                .await?;
                info!("Epochs method won't give a balance summary");
                (None, None, Some(output_descriptors_epochs))
            }
        };
    for (host, outputs) in federation
        .fedimints
        .iter()
        .zip(output_descriptors_utxos.iter())
    {
        debug!("{}: {outputs:?}", host.name);
    }
    // If we import the descriptors on the remote wallet, then we can reuse that
    // wallet later to sign transactions
    let mut imported_descriptors = false;
    let federation_balance = async {
        match &args.command {
            crate::FundsSummarySubCommand::UsingRemoteBitcoin(subargs) => {
                let utxo_balance = if let Some(output_descriptors_utxos) = output_descriptors_utxos
                {
                    info!("Getting wallet balances from utxos using remote bitcoin");
                    Some(
                        do_get_wallet_balances_using_remote_bitcoin(
                            subargs,
                            &federation,
                            output_descriptors_utxos,
                            balance_on_descriptors,
                            &wallet_base_id,
                            RecoveryMethod::Utxos,
                        )
                        .await?,
                    )
                } else {
                    None
                };
                let epochs_balance =
                    if let Some(output_descriptors_epochs) = output_descriptors_epochs {
                        info!("Getting wallet balances from epochs using remote bitcoin");
                        Some(
                            do_get_wallet_balances_using_remote_bitcoin(
                                subargs,
                                &federation,
                                output_descriptors_epochs,
                                balance_on_descriptors,
                                &wallet_base_id,
                                RecoveryMethod::Epochs,
                            )
                            .await?,
                        )
                    } else {
                        None
                    };
                if let (Some(utxo_balance), Some(epochs_balance)) = (utxo_balance, epochs_balance) {
                    if utxo_balance != epochs_balance {
                        anyhow::bail!("utxo balance {utxo_balance} is not the same as epochs balance {epochs_balance}")
                    }
                }
                let balance = utxo_balance
                    .or(epochs_balance)
                    .context("no balance found")?;
                info!("The federation balance according to the remote bitcoin is: {balance}");
                imported_descriptors = true;
                Ok(Some(balance))
            }
            crate::FundsSummarySubCommand::NoBitcoinWallet(_) => Ok(balance_on_descriptors),
        }
    };

    let ln_wallet_balance = async {
        let gateway_ln_balances =
            run_parallel(federation.gateways.iter().map(|gateway| async move {
                let result = lncli_wallet_balance(gateway).await?;
                let sats = u64::from_str(&result.total_balance)?;
                Ok(Amount::from_sat(sats))
            }))
            .await
            .into_iter()
            .collect::<anyhow::Result<Vec<_>>>()?;
        let total_amount = gateway_ln_balances.into_iter().sum::<Amount>();
        Ok::<_, anyhow::Error>(total_amount)
    };
    let ln_channels_local_balance = async {
        let gateway_ln_channels =
            run_parallel(federation.gateways.iter().map(|gateway| async move {
                let result = lncli_list_channels(gateway).await?;
                let sats = result
                    .into_iter()
                    .map(|channel| {
                        u64::from_str(&channel.local_balance)
                            .context("failed to parse local_balance")
                    })
                    .collect::<anyhow::Result<Vec<_>>>()?;
                Ok(Amount::from_sat(sats.into_iter().sum::<u64>()))
            }))
            .await
            .into_iter()
            .collect::<anyhow::Result<Vec<_>>>()?;
        let total_amount = gateway_ln_channels.into_iter().sum::<Amount>();
        Ok::<_, anyhow::Error>(total_amount)
    };

    let (federation_balance, gateway_balances, ln_wallet_balance, ln_channels_local_balance) = join!(
        federation_balance,
        get_gateway_balances(&federation),
        ln_wallet_balance,
        ln_channels_local_balance
    );
    let federation_balance = federation_balance?;
    let gateway_balances = gateway_balances?;
    let gateway_ecash_balance = gateway_balances.into_iter().sum::<Amount>();
    let ln_wallet_balance = ln_wallet_balance?;
    let ln_channels_local_balance = ln_channels_local_balance?;
    info!("The total ecash balance on gateway is: {gateway_ecash_balance}");
    info!("The total ln wallet balance is: {ln_wallet_balance}");
    info!("The total balance on local channels is: {ln_channels_local_balance}");
    let total_from_gateway = gateway_ecash_balance + ln_wallet_balance + ln_channels_local_balance;
    info!("The total from gateway is: {total_from_gateway}");
    if let Some(federation_balance) = federation_balance {
        if gateway_ecash_balance > federation_balance {
            anyhow::bail!(
                "gateway ecash balance: {gateway_ecash_balance} is greater than federation balance {federation_balance}"
        )
        }
        // FIXME: double check if this is correct/makes sense, it seems we need to also
        // the account what liquidity went to remote balance?
        let unaccounted_balanced = federation_balance - gateway_ecash_balance;

        info!("The unaccounted balance on federation (non-gateway peg-ins) is: {unaccounted_balanced}");
        let total_from_federation_and_gateway = federation_balance + total_from_gateway;
        info!("The total that can be extracted from federation and gateway is: {total_from_federation_and_gateway}");
    } else {
        info!("No balance from descriptors and no balance from remote bitcoin, so we calculate the total");
    }
    // restart_fedimints(&federation).await?;
    let mut output = json!({
        "federation_balance": federation_balance.as_ref().map(ToString::to_string),
        "gateway_ecash_balance": gateway_ecash_balance.to_string(),
        "ln_wallet_balance": ln_wallet_balance.to_string(),
        "ln_channels_local_balance": ln_channels_local_balance.to_string(),
        "total_from_gateway": total_from_gateway.to_string(),
    });
    if imported_descriptors {
        info!("Imported descriptors into remote bitcoin wallet, so we can reuse it later with the same wallet base id: {wallet_base_id} and remote bitcoin args: {:?}", args.command);
        output["wallet_base_id"] = wallet_base_id.into();
    }
    print!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}

async fn recover_funds(
    args: crate::RecoverFundsArgs,
    federation: Federation,
) -> anyhow::Result<()> {
    let RecoverFundsSubCommand::UsingRemoteBitcoin(subargs) = args.command;
    let remote_wallets = run_remote_wallet_command(&subargs, "", "listwallets").await?;
    let remote_wallets = serde_json::from_str::<HashSet<String>>(&remote_wallets)?;
    let mut found_wallets = Vec::with_capacity(FEDERATION_MACHINE_NAMES.len());
    let mut wallet_balance: Option<BitcoinBalances> = None;
    for machine_name in FEDERATION_MACHINE_NAMES {
        let wallet_names = HashSet::from([
            get_wallet_name(
                &federation,
                machine_name,
                &args.wallet_base_id,
                RecoveryMethod::Utxos,
            ),
            get_wallet_name(
                &federation,
                machine_name,
                &args.wallet_base_id,
                RecoveryMethod::Epochs,
            ),
        ]);
        let wallet_name = wallet_names.intersection(&remote_wallets).next()
            .with_context(|| format!("Expected to found one of wallets: {wallet_names:?} on machine {machine_name} but it has only: {remote_wallets:?}"))?;
        let balance = get_remote_wallet_balance(&subargs, wallet_name).await?;
        info!("The balance on wallet {wallet_name} is: {balance:?}");
        if balance.trusted == 0.0 {
            anyhow::bail!(
                "The balance on wallet {wallet_name} is 0, so we can't recover funds from it"
            );
        }
        if balance.immature > 0.0 {
            anyhow::bail!(
                "The balance on wallet {wallet_name} has immature funds, so we can't recover funds from it"
            );
        }
        if let Some(wallet_balance) = wallet_balance {
            if wallet_balance != balance {
                anyhow::bail!(
                    "The balance on wallet {wallet_name}: {balance:?} is not the same as the one on the previous wallet: {wallet_balance:?}"
                );
            }
        }
        wallet_balance = Some(balance);
        found_wallets.push(wallet_name.to_owned());
    }
    let mut wallet_iterator = found_wallets.into_iter();
    let first_wallet = wallet_iterator
        .next()
        .expect("list of machines to be non-empty");

    let address = &args.destination_address;
    let amount = Amount::from_btc(wallet_balance.expect("some balance to be present").trusted)?;
    let psbt = remote_create_psbt(&subargs, &first_wallet, address, &amount).await?;

    let mut processed_psbt = remote_process_psbt(&subargs, &first_wallet, &psbt).await?;
    for wallet in wallet_iterator {
        let psbt = processed_psbt.psbt;
        processed_psbt = remote_process_psbt(&subargs, &wallet, &psbt).await?;
        if processed_psbt.complete {
            break;
        }
    }
    if !processed_psbt.complete {
        anyhow::bail!(
            "Even using all wallets the psbt is not complete, so we can't recover funds from it"
        );
    }

    let finalized = remote_finalize_psbt(&subargs, &processed_psbt.psbt).await?;
    assert!(finalized.complete);
    info!("Finalized transaction");
    print!("{}", serde_json::to_string_pretty(&finalized)?);
    if args.broadcast_transaction {
        let txid = remote_send_raw_transaction(&subargs, &finalized.hex)
            .await?
            .to_string();
        info!("Sent transaction");
        print!("{}", serde_json::to_string_pretty(&json!(txid))?);
    }
    Ok(())
}

async fn remote_create_psbt(
    subargs: &crate::UsingRemoteBitcoinArgs,
    wallet: &str,
    address: &Address,
    amount: &Amount,
) -> anyhow::Result<String> {
    let amount_btc = amount.to_btc();
    let create_psbt_command = format!(
        r#"walletcreatefundedpsbt '[]' '[{{"{address}": "{amount_btc}"}}]' 0 '{{"subtractFeeFromOutputs":[0]}}'"#
    );
    let psbt_response = run_remote_wallet_command(subargs, wallet, &create_psbt_command).await?;
    let psbt = serde_json::from_str::<CreatePsbtResponse>(&psbt_response)
        .with_context(|| {
            format!("failed to parse walletcreatefundedpsbt response: {psbt_response:?}")
        })?
        .psbt;
    Ok(psbt)
}

async fn remote_process_psbt(
    subargs: &crate::UsingRemoteBitcoinArgs,
    wallet: &str,
    psbt: &str,
) -> anyhow::Result<ProcessPsbtResponse> {
    let command = format!(r#"walletprocesspsbt '{psbt}'"#);
    let psbt_response = run_remote_wallet_command(subargs, wallet, &command).await?;
    let psbt_response =
        serde_json::from_str::<ProcessPsbtResponse>(&psbt_response).with_context(|| {
            format!("failed to parse walletprocesspsbt response: {psbt_response:?}")
        })?;
    Ok(psbt_response)
}

async fn remote_finalize_psbt(
    subargs: &crate::UsingRemoteBitcoinArgs,
    psbt: &str,
) -> anyhow::Result<FinalizePsbtResponse> {
    let command = format!(r#"finalizepsbt '{psbt}'"#);
    let psbt_response = run_remote_wallet_command(subargs, "", &command).await?;
    let psbt_response = serde_json::from_str::<FinalizePsbtResponse>(&psbt_response)
        .with_context(|| format!("failed to parse finalizepsbt response: {psbt_response:?}"))?;
    Ok(psbt_response)
}

async fn remote_send_raw_transaction(
    subargs: &crate::UsingRemoteBitcoinArgs,
    hex: &str,
) -> anyhow::Result<Txid> {
    let command = format!(r#"sendrawtransaction '{hex}'"#);
    let response = run_remote_wallet_command(subargs, "", &command).await?;
    let response = serde_json::from_str::<Value>(&response)?;
    let txid = response["hex"]
        .as_str()
        .context("failed to get field as string")?;
    let txid = Txid::from_str(&txid)?;
    Ok(txid)
}

async fn do_get_wallet_balances_using_remote_bitcoin(
    subargs: &crate::UsingRemoteBitcoinArgs,
    federation: &Federation,
    output_descriptors: Vec<Vec<RecoveryToolResult>>,
    balance_on_descriptors: Option<Amount>,
    wallet_base_id: &str,
    recovery_method: RecoveryMethod,
) -> anyhow::Result<Amount> {
    let wallets =
        create_remote_wallets(federation, subargs, wallet_base_id, recovery_method).await?;
    import_federation_descriptors_into_wallet(federation, &wallets, output_descriptors, subargs)
        .await?;
    let wallet_balances = get_wallet_balances_using_remote_bitcoin(wallets, subargs).await?;
    if wallet_balances.is_empty() {
        anyhow::bail!("no wallet balances found")
    }
    let first_wallet_balance = &wallet_balances[0];
    if wallet_balances
        .iter()
        .any(|wallet_balance| wallet_balance != first_wallet_balance)
    {
        anyhow::bail!("wallet balances are not the same")
    }
    if first_wallet_balance.untrusted_pending != 0.0 {
        anyhow::bail!("there is a pending balance")
    }
    let wallet_balance = Amount::from_btc(first_wallet_balance.trusted)
        .context("failed to convert wallet balance to Amount")?;
    if let Some(balance_on_descriptors) = balance_on_descriptors {
        if wallet_balance != balance_on_descriptors {
            anyhow::bail!("wallet balance is not the same as the one we got from the descriptors")
        }
    }
    Ok(wallet_balance)
}

async fn get_gateway_balances(federation: &Federation) -> anyhow::Result<Vec<Amount>> {
    let gateway_balances = run_parallel(federation.gateways.iter().map(|gateway| async move {
        let info_response = run_ssh_checked(&gateway.ssh_args, r#"gateway-cli info"#).await?;

        let info_response = serde_json::from_slice::<GatewayCliInfoResponse>(&info_response.stdout)
            .context("failed to parse gateway-cli info response")?;
        if info_response.federations.len() != 1 {
            anyhow::bail!(
                "gateway-cli info response has more than one federation, this is not supported"
            )
        }
        let federation_id = &info_response.federations[0].federation_id;
        debug!("The federation id is: {federation_id}");
        let balance_response = run_ssh_checked(
            &gateway.ssh_args,
            &format!(r#"gateway-cli balance --federation-id {federation_id}"#),
        )
        .await?;
        let msats = String::from_utf8(balance_response.stdout)
            .context("failed to convert balance to string")?
            .trim()
            .parse::<u64>()
            .context("failed to convert balance to satoshis")?;
        let balance = Amount::from_sat(msats / 1000);
        Ok(balance)
    }))
    .await
    .into_iter()
    .collect::<anyhow::Result<Vec<_>>>()
    .context("failed to call gather info from gateways")?;
    Ok(gateway_balances)
}

fn get_wallet_name(
    federation: &Federation,
    machine_name: &str,
    wallet_base_id: &str,
    recovery_method: RecoveryMethod,
) -> String {
    let federation_name = &federation.name;
    format!("devops-cli_{federation_name}_{machine_name}_{wallet_base_id}_{recovery_method}")
}
async fn create_remote_wallets(
    federation: &Federation,
    subargs: &crate::UsingRemoteBitcoinArgs,
    wallet_base_id: &str,
    recovery_method: RecoveryMethod,
) -> anyhow::Result<Vec<String>> {
    let bitcoin_cli = format_bitcoin_cli(&subargs.bitcoin_cli_args)?;
    run_parallel(federation.fedimints.iter().map(|fedimint| {
        let machine_name = &fedimint.name;
        let wallet_name =
            get_wallet_name(federation, machine_name, wallet_base_id, recovery_method);
        let bitcoin_cli = bitcoin_cli.to_owned();
        async move {
            run_ssh_checked(
                &subargs.remote_bitcoin_ssh_args,
                &format!(r#"{bitcoin_cli} createwallet '{wallet_name}'"#,),
            )
            .await
            .map(|_| wallet_name)
        }
    }))
    .await
    .into_iter()
    .collect::<anyhow::Result<Vec<_>>>()
    .context("failed to create wallets on bitcoin")
}

async fn import_federation_descriptors_into_wallet(
    federation: &Federation,
    wallets: &[String],
    output_descriptors: Vec<Vec<RecoveryToolResult>>,
    subargs: &crate::UsingRemoteBitcoinArgs,
) -> anyhow::Result<()> {
    run_sequentially(
        federation
            .fedimints
            .iter()
            .zip(wallets.iter().zip(output_descriptors))
            .map(|(host, (wallet_name, output_descriptors))| {
                let timestamp = host.creation_date.timestamp();
                async move {
                    let output_descriptors = Value::Array(
                        output_descriptors
                            .into_iter()
                            .map(|o| {
                                json!({
                                    "desc": o.descriptor,
                                    "timestamp": timestamp,
                                })
                            })
                            .collect(),
                    );
                    run_remote_wallet_command(
                        subargs,
                        wallet_name,
                        &format!(r#"importdescriptors '{output_descriptors}'"#,),
                    )
                    .await
                }
            }),
    )
    .await
    .into_iter()
    .collect::<anyhow::Result<Vec<_>>>()?;
    Ok(())
}

async fn run_remote_wallet_command(
    args: &crate::UsingRemoteBitcoinArgs,
    wallet_name: &str,
    command: &str,
) -> anyhow::Result<String> {
    let bitcoin_cli = format_bitcoin_cli(&args.bitcoin_cli_args)?;
    let result = run_ssh_checked(
        &args.remote_bitcoin_ssh_args,
        &format!(r#"{bitcoin_cli} -rpcwallet={wallet_name:?} {command}"#),
    )
    .await?;
    Ok(String::from_utf8(result.stdout)?)
}

async fn get_wallet_balances_using_remote_bitcoin(
    wallets: Vec<String>,
    subargs: &crate::UsingRemoteBitcoinArgs,
) -> anyhow::Result<Vec<BitcoinBalances>> {
    run_parallel(
        wallets.iter().map(|wallet_name| async move {
            get_remote_wallet_balance(subargs, wallet_name).await
        }),
    )
    .await
    .into_iter()
    .collect::<anyhow::Result<Vec<_>>>()
}

async fn get_remote_wallet_balance(
    subargs: &crate::UsingRemoteBitcoinArgs,
    wallet_name: &str,
) -> anyhow::Result<BitcoinBalances> {
    run_remote_wallet_command(subargs, wallet_name, "getbalances")
        .await
        .and_then(|output| {
            let Value::Object(o) = serde_json::from_str::<Value>(&output)
                .context("failed to parse balances output")?
            else {
                anyhow::bail!("failed to parse balances output: {output:?}")
            };
            let balances =
                BitcoinBalances::deserialize(o.get("mine").context("mine not found in balances")?)
                    .context("failed to parse balances")?;
            Ok(balances)
        })
}

async fn extract_all_output_descriptors(
    federation: &Federation,
    fedimint_data: Vec<PathBuf>,
    args: &crate::FundsSummaryArgs,
    recovery_method: RecoveryMethod,
) -> anyhow::Result<Vec<Vec<RecoveryToolResult>>> {
    let output_descriptors = run_parallel(
        federation
            .fedimints
            .iter()
            .zip(fedimint_data.into_iter())
            .map(|(host, local_path)| async move {
                extract_output_descriptors_checked(args, local_path.as_path(), recovery_method)
                    .await
                    .with_context(|| {
                        anyhow::anyhow!("failed to extract output descriptors from {}", host.name)
                    })
            }),
    )
    .await
    .into_iter()
    .collect::<anyhow::Result<Vec<_>>>()?;

    Ok(output_descriptors)
}

fn summarize_output_descriptor_balance(
    output_descriptors_utxos: &Vec<Vec<RecoveryToolResult>>,
) -> anyhow::Result<Option<Amount>> {
    if output_descriptors_utxos.is_empty() {
        anyhow::bail!("no output descriptors found")
    }
    let amounts = if output_descriptors_utxos
        .iter()
        .all(|output_descriptors| output_descriptors.iter().all(|o| o.amount_sat.is_some()))
    {
        output_descriptors_utxos
            .iter()
            .map(|output_descriptors| {
                output_descriptors
                    .iter()
                    .map(|output_descriptor| output_descriptor.amount_sat.unwrap())
                    .sum()
            })
            .collect::<Vec<_>>()
    } else {
        return Ok(None);
    };
    // check all amounts are the same
    let first_amount = amounts[0];
    if amounts.iter().any(|amount| *amount != first_amount) {
        anyhow::bail!("not all amounts are the same")
    }
    let balance = Amount::from_sat(first_amount);
    Ok(Some(balance))
}

fn format_bitcoin_cli(args: &BitcoinCliArgs) -> anyhow::Result<String> {
    let mut bitcoin_cli = args
        .bitcoin_cli
        .to_str()
        .context("invalid bitcoin-cli string")?
        .to_owned();
    if let Some(rpcuser) = &args.rpcuser {
        bitcoin_cli.push_str(&format!(" -rpcuser={rpcuser}"));
    }
    if let Some(rpcpassword) = &args.rpcpassword {
        bitcoin_cli.push_str(&format!(" -rpcpassword={rpcpassword}"));
    }
    Ok(bitcoin_cli)
}

async fn command_start_fedimints(
    _args: crate::StartFedimintsArgs,
    federation: Federation,
) -> anyhow::Result<()> {
    info!("Starting...");
    start_fedimints(&federation).await?;
    info!("Started {}", federation.name);
    Ok(())
}

async fn command_restart_fedimints(
    _args: crate::RestartFedimintsArgs,
    federation: Federation,
) -> anyhow::Result<()> {
    info!("Restarting...");
    restart_fedimints(&federation).await?;
    info!("Restarted {}", federation.name);
    Ok(())
}

async fn command_stop_fedimints(
    _args: crate::StopFedimintsArgs,
    federation: Federation,
) -> anyhow::Result<()> {
    info!("Stopping...");
    stop_fedimints(&federation).await?;
    info!("Stopped {}", federation.name);
    Ok(())
}

async fn command_pause_npcnix(
    args: crate::PauseNpcnixArgs,
    federation: Federation,
) -> anyhow::Result<()> {
    tokio::try_join!(
        async {
            run_in_all_hosts(federation.fedimints.iter(), r#"sudo npcnix pause"#)
                .await
                .context("failed to (partially?) pause npcnix on federation")
        },
        async {
            if !args.skip_gateways {
                run_in_all_hosts(federation.gateways.iter(), r#"sudo npcnix pause"#)
                    .await
                    .context("failed to (partially?) pause npcnix on gateways")
            } else {
                Ok(())
            }
        }
    )
    .with_context(|| format!("command npcnix pause failed on {}", federation.name))?;
    info!("Paused npcnix on {}", federation.name);
    Ok(())
}

#[derive(Copy, Clone, Debug)]
enum RecoveryMethod {
    Utxos,
    Epochs,
}

impl std::fmt::Display for RecoveryMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RecoveryMethod::Utxos => write!(f, "utxos"),
            RecoveryMethod::Epochs => write!(f, "epochs"),
        }
    }
}

async fn extract_output_descriptors_checked(
    args: &crate::FundsSummaryArgs,
    path: &Path,
    recovery_method: RecoveryMethod,
) -> anyhow::Result<Vec<RecoveryToolResult>> {
    // recoverytool --password password --cfg . utxos --db database| jq -c '. |
    // map({"desc": .descriptor, "timestamp":1691539200})'
    let mut recovery_tool_command = new_piped_command(args.local_recovery_tool.as_path());
    recovery_tool_command
        .stderr(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stdin(std::process::Stdio::null())
        .arg("--password")
        .arg("password") // TODO: get password from args?
        .arg("--cfg")
        .arg(path)
        .arg(match recovery_method {
            RecoveryMethod::Utxos => "utxos",
            RecoveryMethod::Epochs => "epochs",
        })
        .arg("--db")
        .arg(path.join("database"));
    debug!("Running recovery tool: {recovery_tool_command:?}");
    let output = recovery_tool_command
        .spawn()?
        .wait_with_output()
        .await
        .context("failed to run recovery tool")?;
    let jsons: Vec<RecoveryToolResult> = serde_json::from_slice(output.stdout.as_slice())
        .with_context(|| anyhow::anyhow!("failed to parse output descriptors from: {output:?}"))?;
    if jsons.is_empty() {
        anyhow::bail!("no output descriptors found")
    }
    Ok(jsons)
}

async fn restart_fedimints(federation: &Federation) -> anyhow::Result<()> {
    run_in_all_hosts(
        federation.fedimints.iter(),
        r#"sudo systemctl restart fedimint"#,
    )
    .await
    .context("failed to (partially?) restart fedimints")
}

async fn start_fedimints(federation: &Federation) -> anyhow::Result<()> {
    run_in_all_hosts(
        federation.fedimints.iter(),
        r#"sudo systemctl start fedimint"#,
    )
    .await
    .context("failed to (partially?) start fedimints")
}

async fn stop_fedimints(federation: &Federation) -> anyhow::Result<()> {
    run_in_all_hosts(
        federation.fedimints.iter(),
        r#"sudo systemctl stop fedimint"#,
    )
    .await
    .context("failed to (partially?) stop fedimints")
}

async fn lncli_list_channels(
    remote: &RemoteHost,
) -> anyhow::Result<Vec<ListChannelsResponseChannel>> {
    let output = run_ssh_checked(&remote.ssh_args, r#"lncli listchannels"#).await?;
    let response = serde_json::from_slice::<ListChannelsResponse>(&output.stdout)
        .context("failed to parse listchannels response")?;
    Ok(response.channels)
}

async fn lncli_wallet_balance(remote: &RemoteHost) -> anyhow::Result<WalletBalanceResponse> {
    let output = run_ssh_checked(&remote.ssh_args, r#"lncli walletbalance"#).await?;
    let response = serde_json::from_slice::<WalletBalanceResponse>(&output.stdout)
        .context("failed to parse walletbalance response")?;
    Ok(response)
}

async fn run_in_all_hosts<'a, Hosts: IntoIterator<Item = &'a RemoteHost>>(
    hosts: Hosts,
    command: &str,
) -> anyhow::Result<()> {
    run_parallel(
        hosts
            .into_iter()
            .map(|host| run_ssh_checked(&host.ssh_args, command)),
    )
    .await
    .into_iter()
    .collect::<anyhow::Result<Vec<_>>>()?;
    Ok(())
}

async fn copy_directory_from_hosts<Hosts: IntoIterator<Item = RemoteHost>>(
    hosts: Hosts,
    remote_path: &Path,
    local_path_prefix: &Path,
) -> anyhow::Result<Vec<PathBuf>> {
    run_parallel(hosts.into_iter().map(|host| async move {
        let local_path = local_path_prefix.join(host.name.as_str());
        create_dir_all(&local_path).await?;
        recursive_rsync_from_remote_dir_checked(&host.ssh_args, remote_path, &local_path)
            .await
            .map(|_output| local_path)
    }))
    .await
    .into_iter()
    .collect::<anyhow::Result<Vec<_>>>()
    .with_context(|| anyhow::anyhow!("error copying from {remote_path:?} to {local_path_prefix:?}"))
}
