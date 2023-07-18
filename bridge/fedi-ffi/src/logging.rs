// Stop complaining about unused variables due to cfg macros
#![allow(unused)]
use std::{
    collections::BTreeMap,
    io,
    path::Path,
    str::FromStr,
    sync::{Arc, Mutex},
    time::SystemTime,
};

use anyhow::Context;
use tracing::metadata::LevelFilter;
use tracing_serde::AsSerde;
use tracing_subscriber::{layer::SubscriberExt, prelude::*, EnvFilter, Layer};

use super::event::{Event, EventSink, TypedEventExt};

pub struct ReactNativeLayer(pub EventSink);

impl<S> Layer<S> for ReactNativeLayer
where
    S: tracing::Subscriber,
{
    fn on_event(
        &self,
        event: &tracing::Event<'_>,
        _ctx: tracing_subscriber::layer::Context<'_, S>,
    ) {
        if let Ok(event) = serde_json::to_string(&event.as_serde()) {
            self.0.typed_event(&Event::log(event));
        }
    }
}

// TODO: configurable log level
pub fn init_logging(
    data_dir: &Path,
    event_sink: EventSink,
    log_filter: &str,
) -> anyhow::Result<()> {
    // react native
    #[cfg(not(test))]
    {
        let log_file = data_dir.join("fedi.log");
        let file = std::fs::File::options()
            .create(true)
            .append(true)
            .open(log_file)
            .context("could not open log file")?;

        let log_file_layer = tracing_subscriber::fmt::layer()
            .json()
            .with_writer(Mutex::new(file));

        let reg = tracing_subscriber::registry()
            .with(
                ReactNativeLayer(event_sink)
                    .with_filter(EnvFilter::from_str(log_filter).unwrap_or_default()),
            )
            .with(
                log_file_layer
                    .with_filter(EnvFilter::new("info,fedimint_client=debug,fediffi=trace")),
            );

        let res = if cfg!(target_os = "android") && option_env!("FEDI_DEV_LOGS").is_some() {
            let time = fedimint_core::time::now()
                .duration_since(SystemTime::UNIX_EPOCH)?
                .as_secs();
            reg.with(
                tracing_subscriber::fmt::layer()
                    .with_ansi(true)
                    .pretty()
                    // using time because we can't overwrite existing files in Download
                    .with_writer(Mutex::new(std::fs::File::create(format!(
                        "/storage/emulated/0/Download/fedi-{time}.log",
                    ))?))
                    .with_filter(EnvFilter::from_str(log_filter).unwrap_or_default()),
            )
            .try_init()
        } else {
            reg.try_init()
        };
        res.unwrap_or_else(|error| tracing::info!("Error installing logger: {}", error));
    }
    // #[cfg(target_os = "ios")]
    // use tracing_subscriber::{layer::SubscriberExt, prelude::*, Layer};
    // #[cfg(target_os = "ios")]
    // tracing_subscriber::registry()
    //     .with(
    //         tracing_oslog::OsLogger::new(
    //             "com.justinmoon.fluttermint",
    //             "INFO", // I don't know what this does ...
    //         )
    //         .with_filter(tracing_subscriber::filter::LevelFilter::INFO),
    //     )
    //     .try_init()
    //     .unwrap_or_else(|error| tracing::info!("Error installing logger: {}", error));

    // running tests on a mac
    #[cfg(test)]
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .try_init()
        .unwrap_or_else(|error| tracing::info!("Error installing logger: {}", error));

    Ok(())
}
