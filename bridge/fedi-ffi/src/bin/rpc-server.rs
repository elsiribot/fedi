#[tokio::main]
pub async fn main() -> anyhow::Result<()> {
    fediffi::remote::init().await?;
    Ok(())
}
