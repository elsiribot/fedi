use fedimint_core_v0::{
    encoding::{Decodable, Encodable},
    module::registry::ModuleDecoderRegistry,
    TieredMulti,
};
use fedimint_mint_client_v0::SpendableNote;

// FIXME: copied from fedimint-cli which we don't want to take as a dependency
pub fn parse_ecash(s: &str) -> anyhow::Result<TieredMulti<SpendableNote>> {
    let bytes = base64::decode(s)?;
    Ok(Decodable::consensus_decode(
        &mut std::io::Cursor::new(bytes),
        &ModuleDecoderRegistry::default(),
    )?)
}

// FIXME: copied from fedimint-cli which we don't want to take as a dependency
pub fn serialize_ecash(c: &TieredMulti<SpendableNote>) -> String {
    let mut bytes = Vec::new();
    Encodable::consensus_encode(c, &mut bytes).expect("encodes correctly");
    base64::encode(&bytes)
}
