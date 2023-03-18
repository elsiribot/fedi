export type Key = {
    hex: string
    bytes: Uint8Array
}

export type Keypair = {
    publicKey: Key
    privateKey: Key
}
