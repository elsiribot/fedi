use std::{collections::HashMap, ffi::OsStr, str::FromStr, time::Duration};

use crate::cmd;
use anyhow::{anyhow, bail, Context};

use bitcoin::secp256k1;

use fedimint_client::{
    module::IPrimaryClientModule, secret::PlainRootSecretStrategy, sm::OperationId,
    transaction::TransactionBuilder, Client, ClientBuilder,
};
use fedimint_core::{
    config::ClientConfig,
    core::IntoDynInstance,
    module::{CommonModuleGen, __reexports::serde_json},
    task::TaskGroup,
    Amount, OutPoint, TieredMulti, TieredSummary,
};
use fedimint_ln_client::{LightningClientExt, LightningClientGen, LnPayState};
use fedimint_mint_client::{
    parse_ecash, MintClientExt, MintClientGen, MintClientModule, MintCommonGen, SpendableNote,
};
use fedimint_wallet_client::WalletClientGen;
use futures::StreamExt;
use lightning_invoice::Invoice;

use tracing::{debug, info};

pub async fn mutinynet_faucet_create_invoice(amount: &Amount) -> anyhow::Result<Invoice> {
    let sats = amount.msats / 1000;
    let mut map = HashMap::new();
    map.insert("amount", sats.to_string());

    let client = reqwest::Client::new();
    let res = client
        .post("https://faucet.mutinynet.dev.fedibtc.com/api/create-invoice")
        .json(&map)
        .send()
        .await?;

    let response: serde_json::Value = res.json().await?;
    let invoice = Invoice::from_str(
        response["bolt11"]
            .as_str()
            .ok_or_else(|| anyhow!("Missing bolt11 field on faucet create invoice response"))?,
    )?;

    Ok(invoice)
}

pub async fn try_mutinynet_faucet_create_invoice(
    amount: &Amount,
    tries: usize,
) -> anyhow::Result<Invoice> {
    for _ in 0..tries {
        match mutinynet_faucet_create_invoice(amount).await {
            Ok(invoice) => return Ok(invoice),
            Err(e) => {
                debug!("Failed to get invoice: {e:?}, sleeping a bit");
                fedimint_core::task::sleep(Duration::from_secs(1)).await;
            }
        }
    }
    mutinynet_faucet_create_invoice(amount).await
}

pub async fn cli_get_notes(amount: &Amount) -> anyhow::Result<TieredMulti<SpendableNote>> {
    // TODO: use the new client when it's ready.
    // For instance, when https://github.com/fedimint/fedimint/issues/2567 is solved
    cmd!(FedimintCli, "fetch").out_string().await?;
    let msats_to_get = amount.msats;
    let notes = cmd!(FedimintCli, "spend", "{msats_to_get}")
        .out_json()
        .await?["note"]
        .as_str()
        .map(parse_ecash)
        .transpose()?
        .ok_or_else(|| anyhow!("no note returned"))?;
    Ok(notes)
}

pub async fn try_cli_get_notes(
    amount: &Amount,
    tries: usize,
) -> anyhow::Result<TieredMulti<SpendableNote>> {
    for _ in 0..tries {
        match cli_get_notes(amount).await {
            Ok(notes) => return Ok(notes),
            Err(e) => {
                debug!("Failed to get notes: {e:?}, sleeping a bit");
                fedimint_core::task::sleep(Duration::from_secs(1)).await;
            }
        }
    }
    cli_get_notes(amount).await
}

pub async fn build_client(cfg: &ClientConfig, tg: &mut TaskGroup) -> anyhow::Result<Client> {
    let mut client_builder = ClientBuilder::default();
    client_builder.with_module(MintClientGen);
    client_builder.with_module(LightningClientGen);
    client_builder.with_module(WalletClientGen);
    client_builder.with_primary_module(1);
    client_builder.with_config(cfg.clone());
    let db = fedimint_core::db::mem_impl::MemDatabase::new();
    client_builder.with_database(db);
    let client = client_builder.build::<PlainRootSecretStrategy>(tg).await?;
    Ok(client)
}

pub async fn remint_denomination(
    client: &Client,
    denomination: Amount,
    quantity: u16,
) -> anyhow::Result<()> {
    let (mint_client, client_module_instance) =
        client.get_first_module::<MintClientModule>(&fedimint_mint_client::KIND);
    let mut dbtx = client.db().begin_transaction().await;
    let mut module_transaction = dbtx.with_module_prefix(client_module_instance.id);
    let mut tx = TransactionBuilder::new();
    let operation_id = OperationId::new_random();
    for _ in 0..quantity {
        let output = mint_client
            .create_output(&mut module_transaction, operation_id, 1, denomination)
            .await;
        tx = tx.with_output(output.into_dyn(client_module_instance.id));
    }
    drop(module_transaction);
    let operation_meta_gen = |_txid, _outpoint| ();
    let txid = client
        .finalize_and_submit_transaction(
            operation_id,
            MintCommonGen::KIND.as_str(),
            operation_meta_gen,
            tx,
        )
        .await?;
    let tx_subscription = client.transaction_updates(operation_id).await;
    tx_subscription.await_tx_accepted(txid).await?;
    dbtx.commit_tx().await;
    for i in 0..quantity {
        let out_point = OutPoint {
            txid,
            out_idx: i as u64,
        };
        mint_client
            .await_primary_module_output_finalized(operation_id, out_point)
            .await?;
    }
    Ok(())
}

pub async fn get_note_summary(client: &Client) -> anyhow::Result<TieredSummary> {
    let (mint_client, _) = client.get_first_module::<MintClientModule>(&fedimint_mint_client::KIND);
    let summary = mint_client
        .get_wallet_summary(&mut client.db().begin_transaction().await.with_module_prefix(1))
        .await;
    Ok(summary)
}

pub async fn reissue_notes(
    client: &Client,
    notes: TieredMulti<SpendableNote>,
) -> anyhow::Result<()> {
    let operation_id = client.reissue_external_notes(notes, ()).await?;
    let mut updates = client
        .subscribe_reissue_external_notes_updates(operation_id)
        .await?
        .into_stream();
    while let Some(update) = updates.next().await {
        if let fedimint_mint_client::ReissueExternalNotesState::Failed(e) = update {
            return Err(anyhow::Error::msg(format!("Reissue failed: {e:?}")));
        }
    }
    Ok(())
}

pub async fn gateway_pay_invoice(client: &Client, invoice: Invoice) -> anyhow::Result<()> {
    let operation_id = client
        .pay_bolt11_invoice(client.federation_id(), invoice)
        .await?;
    let mut updates = client
        .subscribe_ln_pay_updates(operation_id)
        .await?
        .into_stream();
    while let Some(update) = updates.next().await {
        info!("LnPayState update: {:?}", update);
        match update {
            LnPayState::Success { preimage: _ } => {
                break;
            }
            LnPayState::Created | LnPayState::Funded | LnPayState::AwaitingChange => {}
            other => bail!("Failed to pay invoice: {other:?}"),
        }
    }
    Ok(())
}

pub fn parse_node_pub_key(s: &str) -> Result<secp256k1::PublicKey, secp256k1::Error> {
    secp256k1::PublicKey::from_str(s)
}

struct FedimintCli;
impl ToCmdExt for FedimintCli {
    type Fut = std::future::Ready<Command>;

    fn cmd(self) -> Self::Fut {
        // try to use alias if set
        let fedimint_cli = std::env::var("FM_MINT_CLIENT")
            .map(|s| s.split_whitespace().map(ToOwned::to_owned).collect())
            .unwrap_or_else(|_| vec!["fedimint-cli".into()]);
        let mut cmd = tokio::process::Command::new(&fedimint_cli[0]);
        cmd.args(&fedimint_cli[1..]);
        std::future::ready(Command {
            cmd,
            args_debug: fedimint_cli,
        })
    }
}

#[macro_export]
macro_rules! cmd {
    ($(@head ($($head:tt)* ))? $curr:literal $(, $($tail:tt)*)?) => {
        cmd! {
            @head ($($($head)*)? format!($curr),)
            $($($tail)*)?
        }
    };
    ($(@head ($($head:tt)* ))? $curr:expr $(, $($tail:tt)*)?) => {
        cmd! {
            @head ($($($head)*)? $curr,)
            $($($tail)*)?
        }
    };
    (@head ($($head:tt)* )) => {
        cmd! {
            @last
            $($head)*
        }
    };
    // last matcher
    (@last $this:expr, $($arg:expr),* $(,)?) => {
        {
            #[allow(unused)]
            use $crate::common::ToCmdExt;
            $this.cmd().await
                $(.arg($arg))*
                .kill_on_drop(true)
                .env("RUST_BACKTRACE", "1")
        }
    };
}

pub trait ToCmdExt {
    type Fut;
    fn cmd(self) -> Self::Fut;
}

// a command that uses self as program name
impl ToCmdExt for &'_ str {
    type Fut = std::future::Ready<Command>;

    fn cmd(self) -> Self::Fut {
        std::future::ready(Command {
            cmd: tokio::process::Command::new(self),
            args_debug: vec![self.to_owned()],
        })
    }
}

pub struct Command {
    pub cmd: tokio::process::Command,
    pub args_debug: Vec<String>,
}

impl Command {
    pub fn arg<T: ToString>(mut self, arg: T) -> Self {
        let string = arg.to_string();
        self.cmd.arg(string.clone());
        self.args_debug.push(string);
        self
    }

    pub fn env<K, V>(mut self, key: K, val: V) -> Self
    where
        K: AsRef<OsStr>,
        V: AsRef<OsStr>,
    {
        self.cmd.env(key, val);
        self
    }

    pub fn envs<I, K, V>(mut self, env: I) -> Self
    where
        I: IntoIterator<Item = (K, V)>,
        K: AsRef<OsStr>,
        V: AsRef<OsStr>,
    {
        self.cmd.envs(env);
        self
    }

    pub fn kill_on_drop(mut self, kill: bool) -> Self {
        self.cmd.kill_on_drop(kill);
        self
    }

    /// Run the command and get its output as json.
    pub async fn out_json(&mut self) -> anyhow::Result<serde_json::Value> {
        Ok(serde_json::from_str(&self.out_string().await?)?)
    }

    fn command_debug(&self) -> String {
        self.args_debug
            .iter()
            .map(|x| x.replace(' ', "␣"))
            .collect::<Vec<_>>()
            .join(" ")
    }

    /// Run the command and get its output as json.
    pub async fn out_string(&mut self) -> anyhow::Result<String> {
        let output = self
            .run_inner()
            .await
            .with_context(|| format!("command: {}", self.command_debug()))?;
        let output = String::from_utf8(output.stdout)?;
        Ok(output.trim().to_owned())
    }

    pub async fn run_inner(&mut self) -> anyhow::Result<std::process::Output> {
        debug!("> {}", self.command_debug());
        let output = self.cmd.output().await?;
        if !output.status.success() {
            bail!(
                "{}\nstdout:\n{}\nstderr:\n{}",
                output.status,
                String::from_utf8_lossy(&output.stdout),
                String::from_utf8_lossy(&output.stderr),
            );
        }
        Ok(output)
    }
}
