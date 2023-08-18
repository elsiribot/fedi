import { InjectionMessageResponseMap, InjectionMessageType } from '../types'
import {
    NostrNip04Provider,
    NostrNip07Provider,
    NostrRelayMapResponse,
    SignedNostrEvent,
    UnsignedNostrEvent,
} from './nostr/types'

import { sendInjectorMessage } from '../utils'

class InjectionNostrProvider implements NostrNip07Provider {
    private lastMessageId = 0
    public nip04: NostrNip04Provider

    constructor() {
        this.nip04 = {
            encrypt: this.nip04encrypt,
            decrypt: this.nip04decrypt,
        }
    }

    // NIP 07

    async getPublicKey(): Promise<string> {
        const result = await this.sendMessage(
            InjectionMessageType.nostr_getPublicKey,
            undefined,
        )
        return result
    }

    async signEvent(event: UnsignedNostrEvent): Promise<SignedNostrEvent> {
        return this.sendMessage(InjectionMessageType.nostr_signEvent, event)
    }

    async getRelays(): Promise<NostrRelayMapResponse> {
        return this.sendMessage(InjectionMessageType.nostr_getRelays, undefined)
    }

    // NIP 04

    async nip04encrypt(peer: string, plaintext: string): Promise<string> {
        return this.sendMessage(InjectionMessageType.nostr_nip04_encrypt, {
            pubkey: peer,
            plaintext,
        })
    }
    async nip04decrypt(peer: string, ciphertext: string): Promise<string> {
        return this.sendMessage(InjectionMessageType.nostr_nip04_decrypt, {
            pubkey: peer,
            ciphertext,
        })
    }

    /** Sends a message to the injector via postMessage, returns response */
    private async sendMessage<T extends InjectionMessageType>(
        type: T,
        data: InjectionMessageResponseMap[T]['message'],
    ): Promise<InjectionMessageResponseMap[T]['response']> {
        const id = this.lastMessageId++
        return sendInjectorMessage({ id, type, data })
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any).nostr = new InjectionNostrProvider()

// Removed during compilation
export default ''
