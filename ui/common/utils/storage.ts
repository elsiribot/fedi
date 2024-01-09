import get from 'lodash/get'

import { CommonState } from '../redux'
import { Chat } from '../types'
import {
    AnyStoredState,
    LatestStoredState,
    StorageApi,
    StoredStateV10,
    StoredStateV2,
    StoredStateV3,
    StoredStateV4,
} from '../types/storage'
import {
    getLatestMessageIdsForChats,
    getLatestMessage,
    getLatestPaymentUpdate,
    getLatestPaymentUpdateIdsForChats,
} from './chat'

export const STATE_STORAGE_KEY = 'fedi:state'

/**
 * Given the current Redux state, transform it into the latest storage state.
 */
export function transformStateToStorage(state: CommonState): LatestStoredState {
    return {
        version: 13,
        onchainDepositsEnabled: state.environment.onchainDepositsEnabled,
        developerMode: state.environment.developerMode,
        stableBalanceEnabled: state.environment.stableBalanceEnabled,
        language: state.environment.language,
        amountInputType: state.environment.amountInputType,
        showFiatTxnAmounts: state.environment.showFiatTxnAmounts,
        currency: state.currency.selectedFiatCurrency,
        btcUsdRate: state.currency.btcUsdRate,
        fiatUsdRates: state.currency.fiatUsdRates,
        activeFederationId: state.federation.activeFederationId,
        authenticatedGuardian: state.federation.authenticatedGuardian,
        externalMeta: state.federation.externalMeta,
        customFediMods: state.federation.customFediMods,
        nuxSteps: state.nux.steps,
        chat: Object.entries(state.chat).reduce<LatestStoredState['chat']>(
            (stored, [federationId, chatState]) => {
                if (chatState) {
                    stored[federationId] = {
                        authenticatedMember: chatState.authenticatedMember,
                        messages: chatState.messages,
                        groups: chatState.groups,
                        groupRoles: chatState.groupRoles,
                        groupAffiliations: chatState.groupAffiliations,
                        members: chatState.membersSeen,
                        lastFetchedMessageId: chatState.lastFetchedMessageId,
                        lastReadMessageIds: chatState.lastReadMessageIds,
                        lastReadPaymentUpdateIds:
                            chatState.lastReadPaymentUpdateIds,
                        lastSeenMessageId: chatState.lastSeenMessageId,
                        lastSeenPaymentUpdateId:
                            chatState.lastSeenPaymentUpdateId,
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
        ['environment', 'language'],
        ['environment', 'amountInputType'],
        ['environment', 'onchainDepositsEnabled'],
        ['environment', 'developerMode'],
        ['environment', 'stableBalanceEnabled'],
        ['environment', 'showFiatTxnAmounts'],
        ['currency', 'selectedFiatCurrency'],
        ['currency', 'prices'],
        ['federation', 'activeFederationId'],
        ['federation', 'authenticatedGuardian'],
        ['federation', 'externalMeta'],
        ['federation', 'customFediMods'],
        ['nux', 'steps'],
    ]

    // Only check current federation's chat state
    const activeFederationId = newState.federation.activeFederationId
    if (activeFederationId) {
        keysetsToCheck.push(['chat', activeFederationId, 'authenticatedMember'])
        keysetsToCheck.push(['chat', activeFederationId, 'messages'])
        keysetsToCheck.push(['chat', activeFederationId, 'groups'])
        keysetsToCheck.push(['chat', activeFederationId, 'groupRoles'])
        keysetsToCheck.push(['chat', activeFederationId, 'membersSeen'])
        keysetsToCheck.push([
            'chat',
            activeFederationId,
            'lastFetchedMessageId',
        ])
        keysetsToCheck.push(['chat', activeFederationId, 'lastReadMessageIds'])
        keysetsToCheck.push(['chat', activeFederationId, 'lastSeenMessageId'])
        keysetsToCheck.push([
            'chat',
            activeFederationId,
            'lastSeenPaymentUpdateId',
        ])
        keysetsToCheck.push([
            'chat',
            activeFederationId,
            'lastReadPaymentUpdateIds',
        ])
    }

    for (const keysToCheck of keysetsToCheck) {
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

    // Version 3 -> 4
    if (migrationState.version === 3) {
        const oldChat = migrationState.chat
        const newChat = Object.entries(oldChat).reduce(
            (prevChat, [federationId, chatState]) => {
                if (!chatState) return prevChat
                if (!chatState.groupRoles) return prevChat
                const groupAffiliations = Object.entries(
                    chatState.groupRoles,
                ).reduce((prevGroup, [groupId, role]) => {
                    if (!role) return prevGroup
                    return {
                        [groupId]: role === 'moderator' ? 'owner' : 'none',
                    }
                }, {} as Record<Chat['id'], string | undefined>)
                return {
                    ...prevChat,
                    [federationId]: {
                        ...chatState,
                        groupAffiliations,
                    },
                }
            },
            {} as StoredStateV4['chat'],
        )
        migrationState = {
            ...migrationState,
            version: 4,
            chat: newChat,
        }
    }

    // Version 4 -> 5
    if (migrationState.version === 4) {
        migrationState = {
            ...migrationState,
            version: 5,
            externalMeta: {},
        }
    }

    // Version 5 -> 6
    if (migrationState.version === 5) {
        migrationState = {
            ...migrationState,
            version: 6,
            btcExchangeRates: {},
        }
    }

    // Version 6 -> 7
    if (migrationState.version === 6) {
        migrationState = {
            ...migrationState,
            version: 7,
            onchainDepositsEnabled: false,
            developerMode: false,
        }
    }

    // Version 7 -> 8
    if (migrationState.version === 7) {
        const { btcExchangeRates, ...rest } = migrationState
        const btcUsdRate = btcExchangeRates['USD'] || 0
        migrationState = {
            ...rest,
            version: 8,
            btcUsdRate,
            fiatUsdRates: {},
        }
    }

    // Version 8 -> 9
    if (migrationState.version === 8) {
        migrationState = {
            ...migrationState,
            version: 9,
            stableBalanceEnabled: false,
        }
    }

    // Version 9 -> 10
    if (migrationState.version === 9) {
        const oldChat = migrationState.chat
        const newChat = Object.entries(oldChat).reduce(
            (prevChat, [federationId, chatState]) => {
                // Add lastSeenPaymentUpdateId to chat state. Initiailize it with every payment
                // update considered "seen" by setting the message ID of its latest payment update
                if (!chatState) return prevChat
                const myId = chatState.authenticatedMember?.id
                if (!myId) return prevChat

                const lastReadPaymentUpdateIds =
                    getLatestPaymentUpdateIdsForChats(chatState.messages, myId)
                const lastSeenPaymentUpdate = getLatestPaymentUpdate(
                    chatState.messages,
                )
                const lastSeenPaymentUpdateId = lastSeenPaymentUpdate?.id
                    ? `${lastSeenPaymentUpdate?.id}_${
                          lastSeenPaymentUpdate?.payment?.updatedAt || 0
                      }`
                    : null
                return {
                    ...prevChat,
                    [federationId]: {
                        ...chatState,
                        lastReadPaymentUpdateIds,
                        lastSeenPaymentUpdateId,
                    },
                }
            },
            {} as StoredStateV10['chat'],
        )
        migrationState = {
            ...migrationState,
            version: 10,
            chat: newChat,
        }
    }

    if (migrationState.version === 10) {
        migrationState = {
            ...migrationState,
            version: 11,
            nuxSteps: {},
        }
    }

    if (migrationState.version === 11) {
        // Add new `joinedAt` field to chat groups. Use the earliest message in
        // the chat, and if it has no messages, use the current time since it's
        // likely a very new chat.
        const oldChat = migrationState.chat
        const newChat = Object.entries(oldChat).reduce(
            (prevChat, [federationId, chatState]) => {
                if (!chatState) return prevChat
                const groups = chatState.groups.map(group => {
                    let joinedAt = Date.now()
                    chatState.messages.forEach(msg => {
                        if (msg.sentIn !== group.id) return
                        joinedAt = Math.min(joinedAt, msg.sentAt)
                    })
                    return { ...group, joinedAt }
                })
                return {
                    ...prevChat,
                    [federationId]: {
                        ...chatState,
                        groups,
                    },
                }
            },
            oldChat,
        )
        migrationState = {
            ...migrationState,
            version: 12,
            chat: newChat,
        }
    }

    // Version 12 -> 13
    if (migrationState.version === 12) {
        migrationState = {
            ...migrationState,
            version: 13,
            showFiatTxnAmounts: true,
        }
    }

    return migrationState
}
