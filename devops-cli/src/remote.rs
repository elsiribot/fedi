use std::path::Path;

use anyhow::{bail, Context};
use tokio::io::AsyncWriteExt;
use tokio::process::Command;
use tracing::debug;

use crate::{new_piped_command, SshArgs};

pub async fn run_ssh_checked(
    ssh_args: &SshArgs,
    command: &str,
) -> anyhow::Result<std::process::Output> {
    let (ssh_command, output) = run_ssh_unchecked(ssh_args, command).await?;
    if !output.status.success() {
        bail!(
            "ssh command: {ssh_command:?} {command:?}\nfailed with status code {}:\nerrors:\n{}\noutput:\n{}",
            output.status,
            String::from_utf8_lossy(&output.stderr),
            String::from_utf8_lossy(&output.stdout)
        );
    }
    Ok(output)
}

pub async fn run_ssh_unchecked(
    ssh_args: &SshArgs,
    command: &str,
) -> anyhow::Result<(Command, std::process::Output)> {
    let mut ssh_command = new_piped_command("ssh");
    ssh_command.arg("-q");
    ssh_command.args(["-o", "StrictHostKeyChecking=no"]);
    if let Some(jump_host) = &ssh_args.jump_host {
        ssh_command.arg("-J").arg(jump_host);
    }
    ssh_command.arg(&ssh_args.destination_host);
    debug!("Running {ssh_command:?} {command:?}");
    let mut ssh = ssh_command.spawn()?;
    ssh.stdin
        .as_mut()
        .context("missing stdin on ssh process")?
        .write_all(command.as_bytes())
        .await?;
    let output = ssh.wait_with_output().await?;
    Ok((ssh_command, output))
}

pub async fn remote_cp(
    ssh_args: &SshArgs,
    remote_path1: &Path,
    remote_path2: &Path,
) -> anyhow::Result<std::process::Output> {
    run_ssh_checked(
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

pub async fn remote_mv(
    ssh_args: &SshArgs,
    remote_path1: &Path,
    remote_path2: &Path,
) -> anyhow::Result<std::process::Output> {
    run_ssh_checked(
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

pub async fn scp_from_remote_to_local(
    ssh_args: &SshArgs,
    remote_path: &Path,
    local_path: &Path,
) -> anyhow::Result<std::process::Output> {
    run_scp_checked(
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
        false,
    )
    .await
}

pub async fn scp_from_local_to_remote(
    ssh_args: &SshArgs,
    local_path: &Path,
    remote_path: &Path,
) -> anyhow::Result<std::process::Output> {
    run_scp_checked(
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
        false,
    )
    .await
}

pub async fn run_scp_checked(
    ssh_args: &SshArgs,
    source: &str,
    target: &str,
    recursive: bool,
) -> anyhow::Result<std::process::Output> {
    let mut scp_command = new_piped_command("scp");
    scp_command.args(["-o", "StrictHostKeyChecking=no"]);
    if let Some(jump_host) = &ssh_args.jump_host {
        scp_command.arg("-J").arg(jump_host);
    }
    if recursive {
        scp_command.arg("-r");
    }
    scp_command.arg(source);
    scp_command.arg(target);
    debug!("Running {scp_command:?}");
    let scp = scp_command.spawn()?;
    let output = scp.wait_with_output().await?;
    if !output.status.success() {
        bail!(
            "scp command failed with status code {}:\nerrors:\n{}\noutput:\n{}",
            output.status,
            String::from_utf8_lossy(&output.stderr),
            String::from_utf8_lossy(&output.stdout)
        );
    }
    Ok(output)
}
//rsync -azv --rsync-path="sudo rsync" -e 'ssh -A -J
// operator@bastion-us-east-1.dev.fedibtc.com'
// operator@private.gateway-mainnet-07.dev.fedibtc.com:/var/lib/gw-lnd
pub async fn recursive_rsync_from_remote_dir_checked(
    ssh_args: &SshArgs,
    remote_path: &Path,
    local_path: &Path,
) -> anyhow::Result<std::process::Output> {
    let mut rsync_command = new_piped_command("rsync");
    rsync_command.arg("-azv");
    if let Some(jump_host) = &ssh_args.jump_host {
        rsync_command
            .arg("-e")
            .arg(format!("ssh -o StrictHostKeyChecking=no -A -J {jump_host}"));
    } else {
        rsync_command
            .arg("-e")
            .arg("ssh -o StrictHostKeyChecking=no");
    }
    rsync_command.arg("--rsync-path=sudo rsync"); // TODO: make this optional?
    rsync_command.arg(format!(
        "{}:{}/", // trailing slash so we copy the contents of the origin directory
        ssh_args.destination_host,
        remote_path
            .to_str()
            .context("remote path is not valid utf8")?
    ));
    rsync_command.arg(
        local_path
            .to_str()
            .context("local path is not valid utf8")?,
    );
    debug!("Running {rsync_command:?}");
    let rsync = rsync_command.spawn()?;
    let output = rsync.wait_with_output().await?;
    if !output.status.success() {
        bail!(
            "rsync command failed with status code {}:\nerrors:\n{}\noutput:\n{}",
            output.status,
            String::from_utf8_lossy(&output.stderr),
            String::from_utf8_lossy(&output.stdout)
        );
    }
    Ok(output)
}
