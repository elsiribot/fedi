use std::path::Path;

use anyhow::{anyhow, bail, Context};
use serde_json::json;
use tracing::info;

use crate::remote::{remote_cp, remote_mv, scp_from_local_to_remote, scp_from_remote_to_local};
use crate::{
    AddDefaultGroupChatArgs, AddKeysPrefixArgs, AddSiteArgs, DuplicateExistingArgs,
    DuplicateExistingSubCommand, EditMetaJsonArgs, EditMetaJsonCommand,
    FederationReferenceOptional, ListFederationsArgs, RemoteFileArgs, RemoveDefaultGroupChatArgs,
    RemoveKeysPrefixArgs, RemoveSiteArgs, SetKeyValueArgs, SetSpecialKeyValueArgs,
    SetSpecialKeyValueSubCommand, ShowMetaJsonArgs, ShowMetaJsonCommand, Site, UpdateSiteArgs,
};

const FEDI_PREFIX: &str = "fedi:";
const SITES_KEY: &str = "sites";
const DEFAULT_GROUP_CHATS_KEY: &str = "default_group_chats";
const FEDERATION_NAME_KEY: &str = "federation_name";
const POPUP_END_TIMESTAMP_KEY: &str = "popup_end_timestamp";

async fn get_remote_config(remote_file_args: &RemoteFileArgs) -> anyhow::Result<MetaConfig> {
    let temp_dir = tempfile::tempdir().context("failed to create tempdir")?;
    let temp_meta_json = temp_dir.path().join("meta.json");
    info!(
        "Copying {}:{} to {}",
        remote_file_args.ssh_args.destination_host,
        remote_file_args.remote_path.display(),
        temp_meta_json.display()
    );
    scp_from_remote_to_local(
        &remote_file_args.ssh_args,
        &remote_file_args.remote_path,
        &temp_meta_json,
    )
    .await
    .context("failed to scp meta.json from remote to local")?;
    let config: serde_json::Value = serde_json::from_reader(std::fs::File::open(&temp_meta_json)?)
        .context("failed to parse meta.json")?;
    let config = match config {
        serde_json::Value::Object(config) => config,
        other => bail!("meta.json is not an object: {other:?}"),
    };
    info!("Parsed config, found {} federations", config.len());

    Ok(MetaConfig(config))
}

pub(super) async fn edit_meta_json(args: EditMetaJsonArgs) -> anyhow::Result<()> {
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
        EditMetaJsonCommand::AddKeysPrefix(args) => add_keys_prefix(&mut config, args)?,
        EditMetaJsonCommand::RemoveKeysPrefix(args) => remove_keys_prefix(&mut config, args)?,
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
    remote_cp(
        &args.remote_file_args.ssh_args,
        &args.remote_file_args.remote_path,
        Path::new(&backup_remote_path),
    )
    .await
    .context("failed to backup remote meta.json")?;
    let mut temp_meta_json_file = std::fs::File::create(&temp_meta_json)?;
    serde_json::to_writer_pretty(&mut temp_meta_json_file, &config.0)?;
    let mut temp_remote_path = args.remote_file_args.remote_path.clone();
    temp_remote_path.set_extension("temp");
    info!(
        "Copying {} to {}:{}",
        temp_meta_json.display(),
        args.remote_file_args.ssh_args.destination_host,
        temp_remote_path.display()
    );
    scp_from_local_to_remote(
        &args.remote_file_args.ssh_args,
        &temp_meta_json,
        &temp_remote_path,
    )
    .await
    .context("failed to scp meta.json from local to remote")?;
    info!(
        "Renaming {} to {}",
        temp_remote_path.display(),
        args.remote_file_args.remote_path.display()
    );
    // mv can be considered atomic, so we expect the file will always be consistent
    remote_mv(
        &args.remote_file_args.ssh_args,
        &temp_remote_path,
        &args.remote_file_args.remote_path,
    )
    .await
    .context("failed to mv meta.json from temp to final destination")?;
    info!("Done");
    Ok(())
}

pub(super) async fn show_meta_json(args: ShowMetaJsonArgs) -> anyhow::Result<()> {
    let config = get_remote_config(&args.remote_file_args).await?;
    match args.command {
        ShowMetaJsonCommand::ListFederations(args) => {
            list_federations(&config, args)?;
        }
    }
    Ok(())
}

fn list_federations(config: &MetaConfig, _: ListFederationsArgs) -> anyhow::Result<()> {
    let mut info = config
        .0
        .iter()
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

fn add_site(config: &mut MetaConfig, args: AddSiteArgs) -> anyhow::Result<()> {
    let mut federation_config = get_federation_config(config, &args.federation_reference)?;
    let site = Site {
        id: args.id,
        title: args.title,
        url: args.url,
        image_url: Some(args.image_url),
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

fn update_site(config: &mut MetaConfig, args: UpdateSiteArgs) -> anyhow::Result<()> {
    let mut federation_config = get_federation_config(config, &args.federation_reference)?;
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

fn remove_site(config: &mut MetaConfig, args: RemoveSiteArgs) -> anyhow::Result<()> {
    let mut federation_config = get_federation_config(config, &args.federation_reference)?;
    let sites_string = match federation_config.get(SITES_KEY) {
        Some(serde_json::Value::String(s)) => s,
        Some(other) => bail!("sites is not a string: {other:?}"),
        None => bail!("No sites found in federation config"),
    };
    let mut sites: Vec<Site> =
        serde_json::from_str(sites_string).context("failed to parse sites")?;
    for id in args.id {
        if let Some(existing_index) = sites.iter().position(|s| s.id == id) {
            info!("  Found {:#?} sites, removing one", sites.len());
            sites.remove(existing_index);
        } else {
            bail!("Site with id {id} does not exist");
        }
    }
    let sites_string = serde_json::to_string(&sites)?;
    federation_config.insert(SITES_KEY.to_string(), serde_json::json!(sites_string));
    Ok(())
}

fn add_default_group_chat(
    config: &mut MetaConfig,
    args: AddDefaultGroupChatArgs,
) -> anyhow::Result<()> {
    let mut federation_config = get_federation_config(config, &args.federation_reference)?;
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
    config: &mut MetaConfig,
    args: RemoveDefaultGroupChatArgs,
) -> anyhow::Result<()> {
    let mut federation_config = get_federation_config(config, &args.federation_reference)?;
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

fn set_key_value(config: &mut MetaConfig, args: SetKeyValueArgs) -> anyhow::Result<()> {
    let mut federation_config = get_federation_config(config, &args.federation_reference)?;
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
    config: &mut MetaConfig,
    args: SetSpecialKeyValueArgs,
) -> anyhow::Result<()> {
    use chrono::TimeZone;
    use chrono_tz::Tz;
    let mut federation_config = get_federation_config(config, &args.federation_reference)?;

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

fn duplicate_existing(config: &mut MetaConfig, args: DuplicateExistingArgs) -> anyhow::Result<()> {
    let DuplicateExistingSubCommand::As(as_command_args) = args.command;
    let existing_federation_config = get_federation_config(config, &args.existing_reference)?;
    let mut new_federation = existing_federation_config.0.clone();
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
    if let Some(conflict) = config.0.insert(
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

fn add_keys_prefix(config: &mut MetaConfig, args: AddKeysPrefixArgs) -> anyhow::Result<()> {
    let federation_config = get_federation_config(config, &args.federation_reference)?;
    for key in federation_config.0.clone().keys() {
        if !key.starts_with(&args.prefix) {
            let new_key = format!("{}{key}", args.prefix);
            let value = federation_config
                .0
                .remove(key)
                .context("value should exist")?;
            federation_config.0.insert(new_key, value);
        }
    }
    Ok(())
}

fn remove_keys_prefix(config: &mut MetaConfig, args: RemoveKeysPrefixArgs) -> anyhow::Result<()> {
    let federation_config = get_federation_config(config, &args.federation_reference)?;
    for key in federation_config.0.clone().keys() {
        if key.starts_with(&args.prefix) {
            let new_key = key
                .strip_prefix(&args.prefix)
                .context("prefix should exist")?;
            let value = federation_config
                .0
                .remove(key)
                .context("value should exist")?;
            federation_config.0.insert(new_key.to_owned(), value);
        }
    }
    Ok(())
}

struct MetaConfig(serde_json::Map<String, serde_json::Value>);

struct FederationConfig<'a>(&'a mut serde_json::Map<String, serde_json::Value>);

impl<'a> FederationConfig<'a> {
    fn get(&self, key: &str) -> Option<&serde_json::Value> {
        for k in [&format!("{FEDI_PREFIX}{key}"), key] {
            if let Some(value) = self.0.get(k) {
                return Some(value);
            }
        }
        None
    }

    fn insert(&mut self, key: String, value: serde_json::Value) -> Option<serde_json::Value> {
        for k in [&format!("{FEDI_PREFIX}{key}"), &key] {
            if let Some(v) = self.0.get_mut(k) {
                let old_value = std::mem::replace(v, value);
                return Some(old_value);
            }
        }
        self.0.insert(key, value)
    }
}

fn get_federation_config<'a>(
    config: &'a mut MetaConfig,
    federation_reference: &FederationReferenceOptional,
) -> anyhow::Result<FederationConfig<'a>> {
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
    match config.0.get_mut(&federation_id) {
        Some(serde_json::Value::Object(federation_config)) => {
            Ok(FederationConfig(federation_config))
        }
        Some(other) => bail!("federation config is not an object: {other:?}"),
        None => bail!("federation config is not present"),
    }
}

fn federation_ids_for_name<'a>(
    config: &'a MetaConfig,
    federation_name: &String,
) -> Vec<&'a String> {
    config
        .0
        .iter()
        .filter_map(|(federation_id, federation_config)| {
            if let serde_json::Value::Object(federation_config) = federation_config {
                for name in [
                    format!("{FEDI_PREFIX}{FEDERATION_NAME_KEY}"),
                    FEDERATION_NAME_KEY.to_string(),
                ] {
                    match federation_config.get(&name) {
                        Some(serde_json::Value::String(name)) if name == federation_name => {
                            return Some(federation_id);
                        }
                        _ => {}
                    };
                }
                None
            } else {
                None
            }
        })
        .collect::<Vec<&String>>()
}
