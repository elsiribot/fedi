// Maintain all versions of stored state below. Stored state versions should
// be fairly immutable, but if you simply want to add a new key, just make
// it optional?: value.
import { Chat, ChatGroup, ChatMember, ChatMessage } from './chat'
import { Federation, Guardian, Site, SupportedCurrency } from './fedimint'

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
        Federation['id'],
        | {
              authenticatedMember: ChatMember | null
              messages: ChatMessage[]
              groups: ChatGroup[]
              members: ChatMember[]
              lastFetchedMessageId: string | null
          }
        | undefined
    >
}

export interface StoredStateV3 extends Omit<StoredStateV2, 'version' | 'chat'> {
    version: 3
    chat: Record<
        Federation['id'],
        | {
              authenticatedMember: ChatMember | null
              messages: ChatMessage[]
              groups: ChatGroup[]
              groupRoles?: Record<ChatGroup['id'], string | undefined>
              members: ChatMember[]
              lastFetchedMessageId: string | null
              lastReadMessageIds: Record<Chat['id'], string | undefined>
              lastSeenMessageId: string | null
          }
        | undefined
    >
    customSites?: Record<Federation['id'], Site[] | undefined>
}

/*** Union of all past shapes of stored state ***/
export type AnyStoredState =
    | StoredStateV0
    | StoredStateV1
    | StoredStateV2
    | StoredStateV3

/*** Alias for the latest version of stored state ***/
export type LatestStoredState = StoredStateV3

export interface StorageApi {
    getItem(key: string): Promise<string | null>
    setItem(key: string, item: string): Promise<void>
    removeItem(key: string): Promise<void>
}
