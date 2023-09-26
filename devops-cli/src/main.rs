use std::path::{Path, PathBuf};

use anyhow::{anyhow, bail, Context};
use clap::{Args, Parser, Subcommand};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::{io::AsyncWriteExt, process::Command};
use tracing::info;
use tracing_subscriber::{filter::LevelFilter, fmt, prelude::*, EnvFilter};

const SITES_KEY: &str = "sites";
const DEFAULT_GROUP_CHATS_KEY: &str = "default_group_chats";
const FEDERATION_NAME_KEY: &str = "federation_name";
const POPUP_END_TIMESTAMP_KEY: &str = "popup_end_timestamp";

#[derive(Parser, Clone)]
#[command(version)]
struct Opts {
    #[clap(subcommand)]
    command: CliCommand,
}

#[derive(Subcommand, Clone)]
enum CliCommand {
    #[command(about = "Edit a meta.json file")]
    EditMetaJson(EditMetaJsonArgs),
    #[command(about = "Show information about a meta.json file")]
    ShowMetaJson(ShowMetaJsonArgs),
}

#[derive(Clone, Args)]
struct EditMetaJsonArgs {
    #[command(flatten)]
    remote_file_args: RemoteFileArgs,

    #[clap(subcommand)]
    command: EditMetaJsonCommand,
}

#[derive(Clone, Args)]
struct RemoteFileArgs {
    #[command(flatten)]
    ssh_args: SshArgs,

    #[arg(long, help = "Remote path to meta.json")]
    remote_path: PathBuf,
}

#[derive(Clone, Args)]
struct ShowMetaJsonArgs {
    #[command(flatten)]
    remote_file_args: RemoteFileArgs,

    #[clap(subcommand)]
    command: ShowMetaJsonCommand,
}

#[derive(Clone, Args)]
struct SshArgs {
    #[arg(long, short = 'J', help = "SSH jump host")]
    jump_host: Option<String>,

    #[arg(long = "ssh", help = "SSH host to connect to")]
    destination_host: String,
}

#[derive(Subcommand, Clone)]
enum EditMetaJsonCommand {
    #[command(about = "Add a site to list of sites")]
    AddSite(AddSiteArgs),
    #[command(about = "Update a specific site in the list of sites")]
    UpdateSite(UpdateSiteArgs),
    #[command(about = "Remove a site from the list of sites")]
    RemoveSite(RemoveSiteArgs),
    #[command(about = "Add a group chat to the list of default group chats")]
    AddDefaultGroupChat(AddDefaultGroupChatArgs),
    #[command(about = "Remove a group chat from the list of default group chats")]
    RemoveDefaultGroupChat(RemoveDefaultGroupChatArgs),
    #[command(about = "Set a key/value pair in the federation config")]
    SetKeyValue(SetKeyValueArgs),
    #[command(about = "Set a key/value from a set of special keys")]
    SetSpecialKeyValue(SetSpecialKeyValueArgs),
    #[command(about = "Create a new federation from an existing one")]
    DuplicateExisting(DuplicateExistingArgs),
}

#[derive(Subcommand, Clone)]
enum ShowMetaJsonCommand {
    ListFederations(ListFederationsArgs),
}

#[derive(Clone, Args)]
struct DuplicateExistingArgs {
    #[command(flatten)]
    existing_reference: FederationReferenceOptional,

    #[clap(subcommand)]
    command: DuplicateExistingSubCommand,
}

#[derive(Subcommand, Clone)]
enum DuplicateExistingSubCommand {
    As(AsArgs),
}

#[derive(Clone, Args)]
struct AsArgs {
    #[command(flatten)]
    new_reference: FederationReferenceRequired,
}

#[derive(Clone, Args)]
struct FederationReferenceOptional {
    #[arg(long)]
    federation_id: Option<String>,

    #[arg(long)]
    federation_name: Option<String>,
}

#[derive(Clone, Args)]
struct FederationReferenceRequired {
    #[arg(long)]
    federation_id: String,
    #[arg(long)]
    federation_name: String,
}

#[derive(Clone, Args)]
struct AddSiteArgs {
    #[command(flatten)]
    federation_reference: FederationReferenceOptional,
    #[arg(long)]
    id: String,
    #[arg(long)]
    title: String,
    #[arg(long)]
    url: String,
    #[arg(long)]
    image_url: Option<String>,
    #[arg(long)]
    position: Option<usize>,
}

#[derive(Clone, Args)]
struct UpdateSiteArgs {
    #[command(flatten)]
    federation_reference: FederationReferenceOptional,
    #[arg(long)]
    id: String,
    #[arg(long)]
    title: Option<String>,
    #[arg(long)]
    url: Option<String>,
    #[arg(long)]
    image_url: Option<String>,
    #[arg(long)]
    position: Option<usize>,
}

#[derive(Clone, Args)]
struct RemoveSiteArgs {
    #[command(flatten)]
    federation_reference: FederationReferenceOptional,
    #[arg(long)]
    id: String,
}

#[derive(Clone, Args)]
struct AddDefaultGroupChatArgs {
    #[command(flatten)]
    federation_reference: FederationReferenceOptional,
    #[arg(long)]
    group_chat: String,
}

#[derive(Clone, Args)]
struct RemoveDefaultGroupChatArgs {
    #[command(flatten)]
    federation_reference: FederationReferenceOptional,
    #[arg(long)]
    group_chat: String,
}

#[derive(Clone, Args)]
struct SetKeyValueArgs {
    #[command(flatten)]
    federation_reference: FederationReferenceOptional,
    #[arg(long)]
    key: String,
    #[arg(long)]
    value: String,
    #[arg(long, action)]
    create_new: bool,
}

#[derive(Clone, Args)]
struct SetSpecialKeyValueArgs {
    #[command(flatten)]
    federation_reference: FederationReferenceOptional,

    #[clap(subcommand)]
    command: SetSpecialKeyValueSubCommand,
}

#[derive(Subcommand, Clone)]
enum SetSpecialKeyValueSubCommand {
    #[command(about = "Set the popup end timestamp")]
    PopupEndTimestamp(PopupEndTimestampArgs),
}

#[derive(Clone, Args)]
struct PopupEndTimestampArgs {
    #[arg(long)]
    year: u16,
    #[arg(long)]
    month: u8,
    #[arg(long)]
    day: u8,
    #[arg(long, help = "Something like America/New_York")]
    tz: String,
}

#[derive(Clone, Args)]
struct ListFederationsArgs;

#[derive(Clone, Debug, Deserialize, Serialize)]
struct Site {
    id: String,
    url: String,
    title: String,
    #[serde(rename = "imageUrl")]
    image_url: Option<String>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(
            EnvFilter::builder()
                .with_default_directive(LevelFilter::INFO.into())
                .from_env_lossy(),
        )
        .init();
    let opts = Opts::parse();
    match opts.command {
        CliCommand::EditMetaJson(args) => edit_meta_json(args).await?,
        CliCommand::ShowMetaJson(args) => show_meta_json(args).await?,
    };
    Ok(())
}

async fn get_remote_config(
    remote_file_args: &RemoteFileArgs,
) -> anyhow::Result<serde_json::Map<String, serde_json::Value>> {
    let temp_dir = tempfile::tempdir().context("failed to create tempdir")?;
    let temp_meta_json = temp_dir.path().join("meta.json");
    info!(
        "Copying {}:{} to {}",
        remote_file_args.ssh_args.destination_host,
        remote_file_args.remote_path.display(),
        temp_meta_json.display()
    );
    let op = scp_from_remote_to_local(
        &remote_file_args.ssh_args,
        &remote_file_args.remote_path,
        &temp_meta_json,
    )
    .await?;
    if !op.status.success() {
        bail!("failed to scp meta.json from remote to local: {op:?}");
    }
    let config: serde_json::Value = serde_json::from_reader(std::fs::File::open(&temp_meta_json)?)
        .context("failed to parse meta.json")?;
    let config = match config {
        serde_json::Value::Object(config) => config,
        other => bail!("meta.json is not an object: {other:?}"),
    };
    info!("Parsed config, found {} federations", config.len());

    Ok(config)
}

async fn edit_meta_json(args: EditMetaJsonArgs) -> anyhow::Result<()> {
    let temp_dir = tempfile::tempdir().context("failed to create tempdir")?;
    let temp_meta_json = temp_dir.path().join("meta.json");

    let mut config = get_remote_config(&args.remote_file_args).await?;
    match args.command {
        EditMetaJsonCommand::AddSite(args) => {
            add_site(&mut config, args)?;
        }
        EditMetaJsonCommand::UpdateSite(args) => update_site(&mut config, args)?,
        EditMetaJsonCommand::RemoveSite(args) => remove_site(&mut config, args)?,
        EditMetaJsonCommand::AddDefaultGroupChat(args) => {
            add_default_group_chat(&mut config, args)?;
        }
        EditMetaJsonCommand::RemoveDefaultGroupChat(args) => {
            remove_default_group_chat(&mut config, args)?;
        }
        EditMetaJsonCommand::SetKeyValue(args) => set_key_value(&mut config, args)?,
        EditMetaJsonCommand::SetSpecialKeyValue(args) => set_special_key_value(&mut config, args)?,
        EditMetaJsonCommand::DuplicateExisting(args) => duplicate_existing(&mut config, args)?,
    };

    let backup_remote_path = format!(
        "{}.{}",
        args.remote_file_args
            .remote_path
            .to_str()
            .context("remote path is not valid utf8")?,
        chrono::Utc::now().format("%Y%m%d%H%M%S")
    );
    info!(
        "Remotely backing up {} to {backup_remote_path}",
        args.remote_file_args.remote_path.display()
    );
    let op = remote_cp(
        &args.remote_file_args.ssh_args,
        &args.remote_file_args.remote_path,
        Path::new(&backup_remote_path),
    )
    .await?;
    if !op.status.success() {
        bail!("failed to backup remote meta.json: {op:?}");
    }
    let mut temp_meta_json_file = std::fs::File::create(&temp_meta_json)?;
    serde_json::to_writer_pretty(&mut temp_meta_json_file, &config)?;
    let mut temp_remote_path = args.remote_file_args.remote_path.clone();
    temp_remote_path.set_extension("temp");
    info!(
        "Copying {} to {}:{}",
        temp_meta_json.display(),
        args.remote_file_args.ssh_args.destination_host,
        temp_remote_path.display()
    );
    let op = scp_from_local_to_remote(
        &args.remote_file_args.ssh_args,
        &temp_meta_json,
        &temp_remote_path,
    )
    .await?;
    if !op.status.success() {
        bail!("failed to scp meta.json from local to remote: {op:?}");
    }
    info!(
        "Renaming {} to {}",
        temp_remote_path.display(),
        args.remote_file_args.remote_path.display()
    );
    // mv can be considered atomic, so we expect the file will always be consistent
    let op = remote_mv(
        &args.remote_file_args.ssh_args,
        &temp_remote_path,
        &args.remote_file_args.remote_path,
    )
    .await?;
    if !op.status.success() {
        bail!("failed to mv meta.json from temp to final destination: {op:?}");
    }
    info!("Done");
    Ok(())
}

async fn show_meta_json(args: ShowMetaJsonArgs) -> anyhow::Result<()> {
    let config = get_remote_config(&args.remote_file_args).await?;
    match args.command {
        ShowMetaJsonCommand::ListFederations(args) => {
            list_federations(&config, args)?;
        }
    }
    Ok(())
}

fn list_federations(
    config: &serde_json::Map<String, serde_json::Value>,
    _: ListFederationsArgs,
) -> anyhow::Result<()> {
    let mut info = config
        .into_iter()
        .filter_map(|(federation_id, federation_config)| {
            if let serde_json::Value::Object(federation_config) = federation_config {
                match federation_config.get(FEDERATION_NAME_KEY) {
                    Some(serde_json::Value::String(name)) => Some((federation_id, name)),
                    _ => None,
                }
            } else {
                None
            }
        })
        .collect::<Vec<_>>();
    info.sort_by(|a, b| a.1.cmp(b.1));

    for (federation_id, name) in info {
        println!(
            "{}",
            json!({"federation_id": federation_id, "federation_name": name})
        );
    }
    Ok(())
}

fn add_site(
    config: &mut serde_json::Map<String, serde_json::Value>,
    args: AddSiteArgs,
) -> anyhow::Result<()> {
    let federation_config = get_federation_config(config, &args.federation_reference)?;
    let site = Site {
        id: args.id,
        title: args.title,
        url: args.url,
        image_url: args.image_url,
    };
    let sites_string = match federation_config.get(SITES_KEY) {
        Some(serde_json::Value::String(s)) => s,
        Some(other) => bail!("sites is not a string: {other:?}"),
        None => "[]",
    };
    let mut sites: Vec<Site> =
        serde_json::from_str(sites_string).context("failed to parse sites")?;
    if let Some(existing) = sites.iter().find(|s| s.id == site.id) {
        bail!("Site with id {:?} already exists: {existing:?}", site.id);
    }
    info!("  Found {:#?} sites, adding one more", sites.len());
    if let Some(position) = args.position {
        sites.insert(position, site);
    } else {
        sites.push(site);
    }
    let sites_string = serde_json::to_string(&sites)?;
    federation_config.insert(SITES_KEY.to_string(), serde_json::json!(sites_string));
    Ok(())
}

fn update_site(
    config: &mut serde_json::Map<String, serde_json::Value>,
    args: UpdateSiteArgs,
) -> anyhow::Result<()> {
    let federation_config = get_federation_config(config, &args.federation_reference)?;
    let sites_string = match federation_config.get(SITES_KEY) {
        Some(serde_json::Value::String(s)) => s,
        Some(other) => bail!("sites is not a string: {other:?}"),
        None => bail!("No sites found in federation config"),
    };
    let mut sites: Vec<Site> =
        serde_json::from_str(sites_string).context("failed to parse sites")?;

    if let Some(existing_index) = sites.iter().position(|s| s.id == args.id) {
        info!("  Found {:#?} sites, updating one", sites.len());
        let current_site = sites[existing_index].clone();
        let updated_site = Site {
            id: args.id,
            title: args.title.unwrap_or(current_site.title),
            url: args.url.unwrap_or(current_site.url),
            image_url: args.image_url.or(current_site.image_url),
        };
        if let Some(position) = args.position {
            sites.remove(existing_index);
            sites.insert(position, updated_site);
        } else {
            sites[existing_index] = updated_site;
        }
    } else {
        bail!("Site with id {} does not exist", args.id);
    }
    let sites_string = serde_json::to_string(&sites)?;
    federation_config.insert(SITES_KEY.to_string(), serde_json::json!(sites_string));
    Ok(())
}

fn remove_site(
    config: &mut serde_json::Map<String, serde_json::Value>,
    args: RemoveSiteArgs,
) -> anyhow::Result<()> {
    let federation_config = get_federation_config(config, &args.federation_reference)?;
    let sites_string = match federation_config.get(SITES_KEY) {
        Some(serde_json::Value::String(s)) => s,
        Some(other) => bail!("sites is not a string: {other:?}"),
        None => bail!("No sites found in federation config"),
    };
    let mut sites: Vec<Site> =
        serde_json::from_str(sites_string).context("failed to parse sites")?;

    if let Some(existing_index) = sites.iter().position(|s| s.id == args.id) {
        info!("  Found {:#?} sites, removing one", sites.len());
        sites.remove(existing_index);
    } else {
        bail!("Site with id {} does not exist", args.id);
    }
    let sites_string = serde_json::to_string(&sites)?;
    federation_config.insert(SITES_KEY.to_string(), serde_json::json!(sites_string));
    Ok(())
}

fn add_default_group_chat(
    config: &mut serde_json::Map<String, serde_json::Value>,
    args: AddDefaultGroupChatArgs,
) -> anyhow::Result<()> {
    let federation_config = get_federation_config(config, &args.federation_reference)?;
    let default_group_chats_string = match federation_config.get(DEFAULT_GROUP_CHATS_KEY) {
        Some(serde_json::Value::String(s)) => s,
        Some(other) => bail!("{DEFAULT_GROUP_CHATS_KEY} is not a string: {other:?}"),
        None => "[]",
    };
    let mut default_group_chats: Vec<String> = serde_json::from_str(default_group_chats_string)
        .with_context(|| anyhow!("failed to parse {DEFAULT_GROUP_CHATS_KEY}"))?;
    if default_group_chats.contains(&args.group_chat) {
        bail!("Default group chat {:?} already exists", args.group_chat);
    }
    info!(
        "  Found {} default group chats, adding one more",
        default_group_chats.len()
    );
    default_group_chats.push(args.group_chat);
    let default_group_chats_string = serde_json::to_string(&default_group_chats)?;
    federation_config.insert(
        DEFAULT_GROUP_CHATS_KEY.to_string(),
        serde_json::json!(default_group_chats_string),
    );
    Ok(())
}

fn remove_default_group_chat(
    config: &mut serde_json::Map<String, serde_json::Value>,
    args: RemoveDefaultGroupChatArgs,
) -> anyhow::Result<()> {
    let federation_config = get_federation_config(config, &args.federation_reference)?;
    let default_group_chats_string = match federation_config.get(DEFAULT_GROUP_CHATS_KEY) {
        Some(serde_json::Value::String(s)) => s,
        Some(other) => bail!("{DEFAULT_GROUP_CHATS_KEY} is not a string: {other:?}"),
        None => bail!("No default group chats found in federation config"),
    };
    let mut default_group_chats: Vec<String> = serde_json::from_str(default_group_chats_string)
        .with_context(|| anyhow!("failed to parse {DEFAULT_GROUP_CHATS_KEY}"))?;

    if let Some(existing_index) = default_group_chats
        .iter()
        .position(|s| s == &args.group_chat)
    {
        info!(
            "  Found {} default group chats, removing one",
            default_group_chats.len()
        );
        default_group_chats.remove(existing_index);
    } else {
        bail!("Default group chat {} does not exist", args.group_chat);
    }
    let default_group_chats_string = serde_json::to_string(&default_group_chats)?;
    federation_config.insert(
        DEFAULT_GROUP_CHATS_KEY.to_string(),
        serde_json::json!(default_group_chats_string),
    );
    Ok(())
}

fn set_key_value(
    config: &mut serde_json::Map<String, serde_json::Value>,
    args: SetKeyValueArgs,
) -> anyhow::Result<()> {
    let federation_config = get_federation_config(config, &args.federation_reference)?;
    match federation_config.insert(args.key.clone(), serde_json::json!(args.value)) {
        Some(serde_json::Value::String(s)) => {
            info!(
                "  Found previous value {s} for key {}, replacing it with {}",
                args.key, args.value
            );
        }
        Some(serde_json::Value::Null) => {
            info!(
                "  Found no previous value for key {}, setting it to {}",
                args.key, args.value
            );
        }
        Some(other) => bail!("Key {} is not a string: {other:?}", args.key),
        None if args.create_new => {
            info!(
                "  Found no previous value for key {}, setting it to {}",
                args.key, args.value
            );
        }
        None => bail!("Key {} does not exist", args.key),
    }
    Ok(())
}

fn set_special_key_value(
    config: &mut serde_json::Map<String, serde_json::Value>,
    args: SetSpecialKeyValueArgs,
) -> anyhow::Result<()> {
    use chrono::TimeZone;
    use chrono_tz::Tz;
    let federation_config = get_federation_config(config, &args.federation_reference)?;

    match args.command {
        SetSpecialKeyValueSubCommand::PopupEndTimestamp(a) => {
            let tz =
                a.tz.parse::<Tz>()
                    .map_err(|e| anyhow::anyhow!("Failed to parse timezone: {e:?}"))?;
            let date = tz
                .with_ymd_and_hms(
                    a.year.try_into()?,
                    a.month.try_into()?,
                    a.day.try_into()?,
                    // end of day: 23:59:59
                    23,
                    59,
                    59,
                )
                .single()
                .context("Invalid date")?;
            let timestamp = date.timestamp();
            federation_config.insert(
                POPUP_END_TIMESTAMP_KEY.to_owned(),
                timestamp.to_string().into(),
            );
        }
    };
    Ok(())
}

fn duplicate_existing(
    config: &mut serde_json::Map<String, serde_json::Value>,
    args: DuplicateExistingArgs,
) -> anyhow::Result<()> {
    let DuplicateExistingSubCommand::As(as_command_args) = args.command;
    let existing_federation_config = get_federation_config(config, &args.existing_reference)?;
    let mut new_federation = existing_federation_config.clone();
    if !federation_ids_for_name(config, &as_command_args.new_reference.federation_name).is_empty() {
        bail!(
            "Federation with name {} already exists, pick another name or renaming existing one",
            as_command_args.new_reference.federation_name
        );
    }
    new_federation.insert(
        FEDERATION_NAME_KEY.to_owned(),
        as_command_args.new_reference.federation_name.into(),
    );
    if let Some(conflict) = config.insert(
        as_command_args.new_reference.federation_id.clone(),
        new_federation.into(),
    ) {
        bail!(
            "Federation with id {} already exists: {conflict:?}",
            as_command_args.new_reference.federation_id
        );
    }
    Ok(())
}

fn get_federation_config<'a>(
    config: &'a mut serde_json::Map<String, serde_json::Value>,
    federation_reference: &FederationReferenceOptional,
) -> anyhow::Result<&'a mut serde_json::Map<String, serde_json::Value>> {
    let federation_id = match federation_reference {
        FederationReferenceOptional {
            federation_id: Some(federation_id),
            federation_name: None,
        } => federation_id,
        FederationReferenceOptional {
            federation_id: None,
            federation_name: Some(federation_name),
        } => {
            let ids = federation_ids_for_name(config, federation_name);
            if ids.len() == 1 {
                let federation_id = ids[0];
                info!("  Federation {federation_name:?} has id {federation_id:?}");
                federation_id
            } else if ids.is_empty() {
                bail!("No federation with name {federation_name} found");
            } else {
                bail!(
                    "Multiple federations with name {} found: {ids:?}",
                    federation_name,
                    ids = ids
                );
            }
        }
        FederationReferenceOptional {
            federation_id: None,
            federation_name: None,
        } => bail!("federation_id or federation_name must be specified"),
        FederationReferenceOptional {
            federation_id: Some(_),
            federation_name: Some(_),
        } => bail!("federation_id and federation_name cannot both be specified"),
    }
    .to_owned();
    match config.get_mut(&federation_id) {
        Some(serde_json::Value::Object(federation_config)) => Ok(federation_config),
        Some(other) => bail!("federation config is not an object: {other:?}"),
        None => bail!("federation config is not present"),
    }
}

fn federation_ids_for_name<'a>(
    config: &'a serde_json::Map<String, serde_json::Value>,
    federation_name: &String,
) -> Vec<&'a String> {
    config
        .iter()
        .filter_map(|(federation_id, federation_config)| {
            if let serde_json::Value::Object(federation_config) = federation_config {
                match federation_config.get(FEDERATION_NAME_KEY) {
                    Some(serde_json::Value::String(name)) if name == federation_name => {
                        Some(federation_id)
                    }
                    _ => None,
                }
            } else {
                None
            }
        })
        .collect::<Vec<&String>>()
}

async fn run_ssh(ssh_args: &SshArgs, command: &str) -> anyhow::Result<std::process::Output> {
    let mut ssh_command = Command::new("ssh");
    ssh_command.arg("-q");
    if let Some(jump_host) = &ssh_args.jump_host {
        ssh_command.arg("-J").arg(jump_host);
    }
    ssh_command.arg(&ssh_args.destination_host);
    ssh_command.stdin(std::process::Stdio::piped());
    ssh_command.stdout(std::process::Stdio::piped());
    let mut ssh = ssh_command.spawn()?;
    ssh.stdin
        .as_mut()
        .context("missing stdin on ssh process")?
        .write_all(command.as_bytes())
        .await?;
    let output = ssh.wait_with_output().await?;
    Ok(output)
}

async fn remote_cp(
    ssh_args: &SshArgs,
    remote_path1: &Path,
    remote_path2: &Path,
) -> anyhow::Result<std::process::Output> {
    run_ssh(
        ssh_args,
        &format!(
            r#"cp "{}" "{}" "#,
            remote_path1
                .to_str()
                .context("remote path is not valid utf8")?,
            remote_path2
                .to_str()
                .context("remote path is not valid utf8")?
        ),
    )
    .await
}

async fn remote_mv(
    ssh_args: &SshArgs,
    remote_path1: &Path,
    remote_path2: &Path,
) -> anyhow::Result<std::process::Output> {
    run_ssh(
        ssh_args,
        &format!(
            r#"mv "{}" "{}" "#,
            remote_path1
                .to_str()
                .context("remote path is not valid utf8")?,
            remote_path2
                .to_str()
                .context("remote path is not valid utf8")?
        ),
    )
    .await
}

async fn scp_from_remote_to_local(
    ssh_args: &SshArgs,
    remote_path: &Path,
    local_path: &Path,
) -> anyhow::Result<std::process::Output> {
    run_scp(
        ssh_args,
        &format!(
            "{}:{}",
            ssh_args.destination_host,
            remote_path
                .to_str()
                .context("remote path is not valid utf8")?
        ),
        local_path
            .to_str()
            .context("local path is not valid utf8")?,
    )
    .await
}

async fn scp_from_local_to_remote(
    ssh_args: &SshArgs,
    local_path: &Path,
    remote_path: &Path,
) -> anyhow::Result<std::process::Output> {
    run_scp(
        ssh_args,
        local_path
            .to_str()
            .context("local path is not valid utf8")?,
        &format!(
            "{}:{}",
            ssh_args.destination_host,
            remote_path
                .to_str()
                .context("remote path is not valid utf8")?
        ),
    )
    .await
}

async fn run_scp(
    ssh_args: &SshArgs,
    source: &str,
    target: &str,
) -> anyhow::Result<std::process::Output> {
    let mut scp_command = Command::new("scp");
    if let Some(jump_host) = &ssh_args.jump_host {
        scp_command.arg("-J").arg(jump_host);
    }
    scp_command.arg(source);
    scp_command.arg(target);
    let scp = scp_command.spawn()?;
    let output = scp.wait_with_output().await?;
    Ok(output)
}
