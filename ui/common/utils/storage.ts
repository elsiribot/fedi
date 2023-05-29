import get from 'lodash/get'

import { CommonState } from '../redux'
import {
    AnyStoredState,
    LatestStoredState,
    StorageApi,
    StoredStateV2,
    StoredStateV3,
} from '../types/storage'
import { getLatestMessageIdsForChats, getLatestMessage } from './chat'

export const STATE_STORAGE_KEY = 'fedi:state'

/**
 * Given the current Redux state, transform it into the latest storage state.
 */
export function transformStateToStorage(state: CommonState): LatestStoredState {
    return {
        version: 3,
        language: state.environment.language,
        currency: state.currency.selectedFiatCurrency,
        activeFederationId: state.federation.activeFederationId,
        authenticatedGuardian: state.federation.authenticatedGuardian,
        chat: Object.entries(state.chat).reduce<LatestStoredState['chat']>(
            (stored, [federationId, chatState]) => {
                if (chatState) {
                    stored[federationId] = {
                        authenticatedMember: chatState.authenticatedMember,
                        messages: chatState.messages,
                        groups: chatState.groups,
                        members: chatState.membersSeen,
                        lastFetchedMessageId: chatState.lastFetchedMessageId,
                        lastReadMessageIds: chatState.lastReadMessageIds,
                        lastSeenMessageId: chatState.lastSeenMessageId,
                    }
                }
                return stored
            },
            {},
        ),
    }
}

/**
 * Retrieve state from storage. Automatically runs migrations on it to ensure
 * it matches the LatestStoredState interface.
 */
export async function getStoredState(
    storage: StorageApi,
): Promise<LatestStoredState | null> {
    const serializedState = await storage.getItem(STATE_STORAGE_KEY)
    if (!serializedState) return null
    const storedState = JSON.parse(serializedState)
    return migrateStoredState(storedState)
}

/**
 * Given the previous version of state and the next version of state, return whether
 * or not there have been any changes that should be persisted.
 */
export function hasStorageStateChanged(
    oldState: CommonState,
    newState: CommonState,
) {
    // This is kind of a pain to keep up to date with transformStateToStorage, but
    // manually doing this and checking by reference is a TON faster than generating
    // two storage objects and deeply comparing them, so it's worth the effort to keep
    // up to date since this will be called on _every_ state change.
    const keysetsToCheck = [
        ['currency', 'selectedFiatCurrency'],
        ['environment', 'language'],
        ['federation', 'activeFederationId'],
        ['federation', 'authenticatedGuardian'],
    ]

    // Only check current federation's chat state
    const activeFederationId = newState.federation.activeFederationId
    if (activeFederationId) {
        keysetsToCheck.push(['chat', activeFederationId, 'authenticatedMember'])
        keysetsToCheck.push(['chat', activeFederationId, 'messages'])
        keysetsToCheck.push(['chat', activeFederationId, 'groups'])
        keysetsToCheck.push(['chat', activeFederationId, 'membersSeen'])
        keysetsToCheck.push([
            'chat',
            activeFederationId,
            'lastFetchedMessageId',
        ])
        keysetsToCheck.push(['chat', activeFederationId, 'lastReadMessageIds'])
        keysetsToCheck.push(['chat', activeFederationId, 'lastSeenMessageId'])
    }

    for (let keysToCheck of keysetsToCheck) {
        if (get(oldState, keysToCheck) !== get(newState, keysToCheck)) {
            return true
        }
    }
    return false
}

/**
 * Runs any version of stored state through a series of transformations that
 * migrates it to the latest version of stored state.
 */
function migrateStoredState(state: AnyStoredState): LatestStoredState {
    let migrationState = { ...state }

    // Version 0 -> 1
    if (migrationState.version === 0) {
        migrationState = {
            ...migrationState,
            version: 1,
            language: null,
            currency: null,
            activeFederationId: null,
            authenticatedGuardian: null,
            chatIdentities: {},
        }
    }

    // Version 1 -> 2
    if (migrationState.version === 1) {
        const { chatIdentities, ...rest } = migrationState
        migrationState = {
            ...rest,
            version: 2,
            chat: Object.entries(chatIdentities).reduce<StoredStateV2['chat']>(
                (chat, [federationId, authenticatedMember]) => {
                    if (authenticatedMember) {
                        chat[federationId] = {
                            authenticatedMember,
                            messages: [],
                            groups: [],
                            members: [],
                            lastFetchedMessageId: null,
                        }
                    }
                    return chat
                },
                {},
            ),
        }
    }

    // Version 2 -> 3
    if (migrationState.version === 2) {
        // Add lastReadMessageIds to chat state. Initiailize it with every chat
        // considered "read" by having its latest message ID added to the map.
        const oldChat = migrationState.chat
        const newChat = Object.entries(oldChat).reduce(
            (prevChat, [federationId, chatState]) => {
                if (!chatState) return prevChat
                const myId = chatState.authenticatedMember?.id
                if (!myId) return prevChat
                const lastReadMessageIds = getLatestMessageIdsForChats(
                    chatState.messages,
                    myId,
                )
                const lastSeenMessageId =
                    getLatestMessage(chatState.messages)?.id || null
                return {
                    ...prevChat,
                    [federationId]: {
                        ...chatState,
                        lastReadMessageIds,
                        lastSeenMessageId,
                    },
                }
            },
            {} as StoredStateV3['chat'],
        )
        migrationState = {
            ...migrationState,
            version: 3,
            chat: newChat,
        }
    }

    return migrationState
}
