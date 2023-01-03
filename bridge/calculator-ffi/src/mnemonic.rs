use rand::Rng;

pub struct UserSeedPhrase(bip39::Mnemonic);

impl UserSeedPhrase {
    pub fn new() -> Self {
        let mut rng = rand::rngs::OsRng;
        let entropy: Vec<u8> = (0..32).map(|_| rng.gen()).collect();
        return Self(
            bip39::Mnemonic::from_entropy(&entropy)
                .expect("failed to create mnemonic from entropy"),
        );
    }
}
