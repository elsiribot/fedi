// Stop complaining about unused variables due to cfg macros
#![allow(unused)]
use std::{collections::BTreeMap, sync::Arc};

use tracing::metadata::LevelFilter;
use tracing_subscriber::{layer::SubscriberExt, prelude::*, Layer};

use crate::{event::Event, EventSinkWrapper};

pub struct ReactNativeLayer(pub Arc<EventSinkWrapper>);

impl<S> Layer<S> for ReactNativeLayer
where
    S: tracing::Subscriber,
{
    fn on_event(
        &self,
        event: &tracing::Event<'_>,
        _ctx: tracing_subscriber::layer::Context<'_, S>,
    ) {
        let mut fields = BTreeMap::new();
        let mut visitor = StringVisitor(&mut fields);
        event.record(&mut visitor);
        // TODO: implement proper formatting
        if let Some(message) = fields.get("message") {
            let log = format!(
                "(rust) {}: {}",
                event.metadata().level().to_string().to_uppercase(),
                message
            );
            let event = Event::log(log);
            self.0.event(&event);
        }
    }
}

struct StringVisitor<'a>(&'a mut BTreeMap<String, String>);

impl<'a> tracing::field::Visit for StringVisitor<'a> {
    fn record_f64(&mut self, field: &tracing::field::Field, value: f64) {
        self.0.insert(field.name().to_string(), value.to_string());
    }

    fn record_i64(&mut self, field: &tracing::field::Field, value: i64) {
        self.0.insert(field.name().to_string(), value.to_string());
    }

    fn record_u64(&mut self, field: &tracing::field::Field, value: u64) {
        self.0.insert(field.name().to_string(), value.to_string());
    }

    fn record_bool(&mut self, field: &tracing::field::Field, value: bool) {
        self.0.insert(field.name().to_string(), value.to_string());
    }

    fn record_str(&mut self, field: &tracing::field::Field, value: &str) {
        self.0.insert(field.name().to_string(), value.to_string());
    }

    fn record_error(
        &mut self,
        field: &tracing::field::Field,
        value: &(dyn std::error::Error + 'static),
    ) {
        self.0.insert(field.name().to_string(), value.to_string());
    }

    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        self.0
            .insert(field.name().to_string(), format!("{:?}", value));
    }
}

// TODO: configurable log level
pub fn init_logging(event_sink: Arc<EventSinkWrapper>) {
    // #[cfg(target_os = "android")]
    tracing_subscriber::registry()
        .with(ReactNativeLayer(event_sink).with_filter(LevelFilter::INFO))
        .try_init()
        .unwrap_or_else(|error| tracing::info!("Error installing logger: {}", error));
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
    #[cfg(target_os = "macos")]
    tracing_subscriber::fmt()
        .try_init()
        .unwrap_or_else(|error| tracing::info!("Error installing logger: {}", error));
}
