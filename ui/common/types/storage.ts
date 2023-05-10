// Maintain all versions of stored state below. Stored state versions should
// be fairly immutable, but if you simply want to add a new key, just make
// it optional?: value.
import { ChatGroup, ChatMember, ChatMessage } from './chat'
import { Guardian, SupportedCurrency } from './fedimint'

export interface StoredStateV0 {
    version: 0 // Not a real version, just implemented for demonstrative purposes
}

export interface StoredStateV1 extends Omit<StoredStateV0, 'version'> {
    version: 1
    language: string | null
    currency: SupportedCurrency | null
    activeFederationId: string | null
    authenticatedGuardian: Guardian | null
    chatIdentities: Record<string, ChatMember | undefined>
}

export interface StoredStateV2
    extends Omit<StoredStateV1, 'version' | 'chatIdentities'> {
    version: 2
    chat: Record<
        string,
        | {
              authenticatedMember: ChatMember | null
              messages: ChatMessage[]
              groups: ChatGroup[]
              members: ChatMember[]
          }
        | undefined
    >
}

/*** Union of all past shapes of stored state ***/
export type AnyStoredState = StoredStateV0 | StoredStateV1 | StoredStateV2

/*** Alias for the latest version of stored state ***/
export type LatestStoredState = StoredStateV2

export interface StorageApi {
    getItem(key: string): Promise<string | null>
    setItem(key: string, item: string): Promise<void>
    removeItem(key: string): Promise<void>
}
