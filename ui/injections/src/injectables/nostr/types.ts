export interface UnsignedNostrEvent {
    created_at: number
    kind: number
    content: string
    tags: Array<Array<string>>
}

export interface SignedNostrEvent {
    id: string
    pubkey: string
    created_at: number
    kind: number
    content: string
    tags: Array<Array<string>>
    sig: string
}

export interface NostrRelayMapResponse {
    [key: string]: Record<string, boolean>
}

export interface NostrNip07Provider {
    getPublicKey(): Promise<string>
    signEvent(event: UnsignedNostrEvent): Promise<SignedNostrEvent>
    getRelays(): Promise<NostrRelayMapResponse>
}

export interface NostrNip04Provider {
    encrypt(peer: string, plaintext: string): Promise<string>
    decrypt(peer: string, ciphertext: string): Promise<string>
}
