use std::path::Path;

use fedimint_api::{Amount, NumPeers};
use fedimint_core::config::ClientConfig;
use fedimint_sled::SledDb;
use mint_client::{
    api::{WsFederationApi, WsFederationConnect},
    query::CurrentConsensus,
    ClientError, UserClient, UserClientConfig,
};
use std::fs::File;

type Result<T> = std::result::Result<T, ClientError>;

pub fn init_logging() {
    // Configure Android logging
    #[cfg(target_os = "android")]
    use tracing_subscriber::{layer::SubscriberExt, prelude::*, Layer};
    #[cfg(target_os = "android")]
    tracing_subscriber::registry()
        .with(
            paranoid_android::layer("com.fedi.app.fedi")
                .with_filter(tracing_subscriber::filter::LevelFilter::INFO),
        )
        .try_init()
        .unwrap_or_else(|error| tracing::info!("Error installing logger: {}", error));

    // Configure iOS logging
    // #[cfg(target_os = "ios")]
    // use tracing_subscriber::{layer::SubscriberExt, prelude::*, Layer};
    // #[cfg(target_os = "ios")]
    // tracing_subscriber::registry()
    //     .with(
    //         tracing_oslog::OsLogger::new(
    //             "com.fedi.app.fedi",
    //             "INFO", // I don't know what this does ...
    //         )
    //         .with_filter(tracing_subscriber::filter::LevelFilter::INFO),
    //     )
    //     .try_init()
    //     .unwrap_or_else(|error| tracing::info!("Error installing logger: {}", error));
}

pub async fn init(data_dir: String) -> Result<String> {
    init_logging();

    let connection_string = String::from(r#"{"members":[[0,"ws://188.166.55.8:4001"]]}"#);

    // Download federation config
    let connect_cfg: WsFederationConnect = serde_json::from_str(&connection_string).expect("FIXME");
    tracing::info!("parsed connection string");
    let api = WsFederationApi::new(connect_cfg.members);
    tracing::info!("fetching config");
    let cfg: ClientConfig = api
        // FIXME: is this the correct policy?
        .request(
            "/config",
            (),
            CurrentConsensus::new(api.peers().one_honest()),
        )
        .await?;
    tracing::info!("config {:?}", &cfg);

    // tracing::info!("config {}", &cfg_string);
    // Hack to run against local federation
    let mut cfg_string = serde_json::to_string(&cfg).unwrap();
    cfg_string = cfg_string.replace("localhost", "10.0.2.2");
    cfg_string = cfg_string.replace("127.0.0.1", "10.0.2.2");
    let cfg: ClientConfig = serde_json::from_str(&cfg_string).expect("FIXME");

    // Save config
    let cfg_path = Path::new(&data_dir).join(format!("{}.json", cfg.federation_name));
    tracing::info!("saving file to {}", cfg_path.display());
    let cfg_path = Path::new(&data_dir).join(format!("{}.json", cfg.federation_name));
    // FIXME: don't do synchronous file creation ...
    let file = File::create(cfg_path) // FIXME: this should probably use tokio's `File`
        .expect("Could not create cfg file");
    serde_json::to_writer_pretty(file, &cfg).expect("Could not write gateway cfg");

    // Create user client
    let db_path = Path::new(&data_dir).join(format!("{}.db", cfg.federation_name));
    let db = SledDb::open(db_path, "client").expect("FIXME");
    let client = UserClient::new(UserClientConfig(cfg.clone()), db.into(), Default::default());

    let invoice = client
        .generate_invoice(Amount::from_sat(1), "foo".into(), rand::rngs::OsRng, None)
        .await?;

    Ok(invoice.invoice.to_string())
}
