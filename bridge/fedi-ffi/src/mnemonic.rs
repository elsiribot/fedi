use std::borrow::Cow;

pub struct Mnemonic(bip39::Mnemonic);

impl Mnemonic {
    // pub fn new() -> Self {
    //     let mut rng = rand::rngs::OsRng;
    //     let entropy: Vec<u8> = (0..32).map(|_| rng.gen()).collect();
    //     Self::from_entropy(entropy)
    // }

    pub fn from_entropy(entropy: &[u8]) -> Self {
        return Self(
            bip39::Mnemonic::from_entropy(entropy).expect("failed to create mnemonic from entropy"),
        );
    }

    // FIXME: impl Serialize instead
    pub fn serialize(&self) -> Vec<String> {
        let serialized: Vec<String> = self
            .0
            .to_string()
            .split(" ")
            .map(|s| s.to_string())
            .collect();
        // FIXME: where is a better place to ensure this?
        assert!(serialized.len() == 12, "invalid mnemonic length");
        serialized
    }

    pub fn to_string(&self) -> String {
        self.serialize().join(" ")
    }

    pub fn parse<'a, S: Into<Cow<'a, str>>>(s: S) -> Result<Self, anyhow::Error> {
        Ok(Self(bip39::Mnemonic::parse(s)?))
    }

    pub fn to_entropy(&self) -> Vec<u8> {
        self.0.to_entropy()
    }
}
