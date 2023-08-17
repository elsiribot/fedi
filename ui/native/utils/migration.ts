import AsyncStorage from '@react-native-async-storage/async-storage'

import {
    setChatGroupAffiliation,
    setChatGroupRole,
    setChatGroups,
    setChatMembersSeen,
    setChatMessages,
    setLastReadMessageId,
    setLastSeenMessageId,
} from '@fedi/common/redux'
import { Chat, ChatMessage, Federation } from '@fedi/common/types'
import {
    getLatestMessage,
    getLatestMessageIdsForChats,
} from '@fedi/common/utils/chat'

import {
    CHAT_GROUPS_PERSISTENCE_KEY,
    CHAT_MEMBERS_PERSISTENCE_KEY,
    CHAT_MESSAGES_PERSISTENCE_KEY,
} from '../constants'
import { AppStore } from '../state/store'

/*
    Legacy Chat Data Migration
    All functions below are used to manage a data migration where chat data
    was previously stored with weak serializability and needed to be gracefully
    moved to work with the Redux-based storage manager

    TS `any` types are used here in favor of temporarily re-introducing
    some old chat types that were already removed
*/
const convertMessages = (legacyMessages: any, myId: any) => {
    console.info('preparing', legacyMessages.length, 'messages for migration')
    const migratedMessages = legacyMessages.map((lm: any) => {
        let m: ChatMessage = {
            id: lm.id,
            content: lm.content,
            sentAt: lm.sentAt,
            sentBy: `${lm.sentBy.jid._local}@${lm.sentBy.jid._domain}`,
        }
        if (lm.sentTo) {
            m.sentTo = `${lm.sentTo.jid._local}@${lm.sentTo.jid._domain}`
        }
        if (lm.sentIn) {
            m.sentIn = `${lm.sentIn.id}`
        }
        if (lm.payment) {
            m.payment = {
                amount: lm.payment.amount,
                status: lm.payment.status,
                updatedAt: lm.payment.updatedAt,
                recipient: `${lm.payment.recipient.jid._local}@${lm.payment.recipient.jid._domain}`,
            }
            if (lm.payment.hasOwnProperty('token')) {
                m.payment.token = lm.payment.token
            }
        }
        return m
    })
    return {
        messages: migratedMessages,
        lastReadMessageIds: getLatestMessageIdsForChats(migratedMessages, myId),
        lastSeenMessageId: getLatestMessage(migratedMessages)?.id || null,
    }
}
const convertGroups = (legacyGroups: any) => {
    console.info('preparing', legacyGroups.length, 'groups for migration')
    return {
        groups: legacyGroups.map((lg: any) => {
            return {
                id: lg.id,
                name: lg.name,
                broadcastOnly: lg.broadcastOnly || false,
            }
        }),
        groupRoles: legacyGroups.reduce((result: any, lg: any) => {
            result[lg.id] = lg.myRole || 'moderator'
            return result
        }, {}),
        groupAffiliations: legacyGroups.reduce((result: any, lg: any) => {
            result[lg.id] = lg.myRole === 'moderator' ? 'owner' : 'none'
            return result
        }, {}),
    }
}
const convertMembers = (legacyMembers: any) => {
    console.info('preparing', legacyMembers.length, 'members for migration')
    return legacyMembers.map((lm: any) => {
        return {
            id: `${lm.jid._local}@${lm.jid._domain}`,
            username: lm.jid._local,
            publicKeyHex: lm.publicKeyHex,
        }
    })
}

const checkForAlreadyMigratedData = async (federationId: string) => {
    // A MIGRATED: prefix for each storage key means the migration has
    // already been performed and a backup has been stored here in case
    // anything goes wrong and we need to recover the original data
    const alreadyMigratedMessages = await AsyncStorage.getItem(
        `MIGRATED:${CHAT_MESSAGES_PERSISTENCE_KEY}:${federationId}`,
    )
    const alreadyMigratedMembers = await AsyncStorage.getItem(
        `MIGRATED:${CHAT_MEMBERS_PERSISTENCE_KEY}:${federationId}`,
    )
    const alreadyMigratedGroups = await AsyncStorage.getItem(
        `MIGRATED:${CHAT_GROUPS_PERSISTENCE_KEY}:${federationId}`,
    )
    if (alreadyMigratedMessages) {
        console.warn(
            `already migrated ${CHAT_MESSAGES_PERSISTENCE_KEY}`,
            `for fed ${federationId.slice(0, 10)}`,
        )
    }
    if (alreadyMigratedMembers) {
        console.warn(
            `already migrated ${CHAT_MEMBERS_PERSISTENCE_KEY}`,
            `for fed ${federationId.slice(0, 10)}`,
        )
    }
    if (alreadyMigratedGroups) {
        console.warn(
            `already migrated ${CHAT_GROUPS_PERSISTENCE_KEY}`,
            `for fed ${federationId.slice(0, 10)}`,
        )
    }
}

export function checkForLegacyChatMigrations(store: AppStore) {
    const state = store.getState()
    const { federations } = state.federation
    federations.map(async (f: Federation) => {
        const chatState = state.chat[f.id]
        const migrateLegacyChatData = async () => {
            console.info(
                'checking AsyncStorage for legacy chat state from federation',
                f.id.slice(0, 10),
            )
            // Throws warnings if this migration has been run already
            // for this federation's chat state
            checkForAlreadyMigratedData(f.id)

            // Check all 3 storage keys for legacy data on each federation.
            // When the migration completes, a backup will be created with a
            // MIGRATED: prefix key and data stored in these keys will be deleted
            const legacyChatMessages = await AsyncStorage.getItem(
                `${CHAT_MESSAGES_PERSISTENCE_KEY}:${f.id}`,
            )
            const legacyChatMembers = await AsyncStorage.getItem(
                `${CHAT_MEMBERS_PERSISTENCE_KEY}:${f.id}`,
            )
            const legacyChatGroups = await AsyncStorage.getItem(
                `${CHAT_GROUPS_PERSISTENCE_KEY}:${f.id}`,
            )

            let migratedChatMessages, migratedChatGroups, migratedChatMembers
            if (legacyChatMessages) {
                const { messages } = JSON.parse(legacyChatMessages)
                console.info(
                    'legacyChatMessages detected',
                    `for fed ${f.id.slice(0, 10)}`,
                )
                // Converts legacy Messages to redux ChatMessages
                migratedChatMessages = convertMessages(
                    messages,
                    chatState?.authenticatedMember?.id,
                )
                console.info(
                    migratedChatMessages.messages.length,
                    'messages to be migrated',
                    `for fed ${f.id.slice(0, 10)}`,
                )
                // Store migrated legacy chat members in redux
                // (overwrites what should be an empty array)
                store.dispatch(
                    setChatMessages({
                        federationId: f.id,
                        messages: migratedChatMessages.messages,
                    }),
                )
                if (migratedChatMessages.lastSeenMessageId) {
                    console.info(
                        'dispatch: lastSeenMessageId',
                        migratedChatMessages.lastSeenMessageId,
                        `for fed ${f.id.slice(0, 10)}`,
                    )
                    store.dispatch(
                        setLastSeenMessageId({
                            federationId: f.id,
                            messageId:
                                migratedChatMessages.lastSeenMessageId as string,
                        }),
                    )
                }
                // Add chat last read message IDs in redux
                for (const [chatId, messageId] of Object.entries(
                    migratedChatMessages.lastReadMessageIds as Record<
                        Chat['id'],
                        string | undefined
                    >,
                )) {
                    console.info(
                        'dispatch: setLastReadMessageId',
                        chatId,
                        messageId,
                        `for fed ${f.id.slice(0, 10)}`,
                    )
                    store.dispatch(
                        setLastReadMessageId({
                            federationId: f.id,
                            chatId,
                            messageId: messageId as string,
                        }),
                    )
                }
                // Store a backup and delete the original key
                await AsyncStorage.setItem(
                    `MIGRATED:${CHAT_MESSAGES_PERSISTENCE_KEY}:${f.id}`,
                    legacyChatMessages,
                )
                await AsyncStorage.removeItem(
                    `${CHAT_MESSAGES_PERSISTENCE_KEY}:${f.id}`,
                )
            } else {
                console.info(
                    'No legacyChatMessages found',
                    `for fed ${f.id.slice(0, 10)}`,
                )
            }
            if (legacyChatMembers) {
                const { members } = JSON.parse(legacyChatMembers)
                console.info(
                    'legacyChatMembers detected',
                    `for fed ${f.id.slice(0, 10)}`,
                )
                // Converts legacy Members to redux ChatMembers
                migratedChatMembers = convertMembers(members)
                console.info(
                    migratedChatMembers.length,
                    'members to be migrated',
                    `for fed ${f.id.slice(0, 10)}`,
                )
                // Store migrated legacy chat members in redux
                // (overwrites what should be an empty array)
                store.dispatch(
                    setChatMembersSeen({
                        federationId: f.id,
                        membersSeen: migratedChatMembers,
                    }),
                )
                // Store a backup and delete the original key
                await AsyncStorage.setItem(
                    `MIGRATED:${CHAT_MEMBERS_PERSISTENCE_KEY}:${f.id}`,
                    legacyChatMembers,
                )
                await AsyncStorage.removeItem(
                    `${CHAT_MEMBERS_PERSISTENCE_KEY}:${f.id}`,
                )
            } else {
                console.info(
                    'No legacyChatMembers found',
                    `for fed ${f.id.slice(0, 10)}`,
                )
            }
            if (legacyChatGroups) {
                const { groups } = JSON.parse(legacyChatGroups)
                console.info(
                    'legacyChatGroups detected',
                    `for fed ${f.id.slice(0, 10)}`,
                )
                // Converts legacy Groups to redux ChatGroups
                migratedChatGroups = convertGroups(groups)
                console.info(
                    migratedChatGroups.groups.length,
                    'groups to be migrated',
                    `for fed ${f.id.slice(0, 10)}`,
                )
                // Store migrated legacy chat groups in redux
                // (overwrites what should be an empty array)
                store.dispatch(
                    setChatGroups({
                        federationId: f.id,
                        groups: migratedChatGroups.groups,
                    }),
                )
                // Add chat group roles to redux
                for (const [groupId, role] of Object.entries(
                    migratedChatGroups.groupRoles as Record<
                        Chat['id'],
                        string | undefined
                    >,
                )) {
                    store.dispatch(
                        setChatGroupRole({
                            federationId: f.id,
                            groupId,
                            role: role as string,
                        }),
                    )
                }
                // Add chat group affiliations to redux
                for (const [groupId, affiliation] of Object.entries(
                    migratedChatGroups.groupAffiliations as Record<
                        Chat['id'],
                        string | undefined
                    >,
                )) {
                    store.dispatch(
                        setChatGroupAffiliation({
                            federationId: f.id,
                            groupId,
                            affiliation: affiliation as string,
                        }),
                    )
                }
                // Store a backup and delete the original key
                await AsyncStorage.setItem(
                    `MIGRATED:${CHAT_GROUPS_PERSISTENCE_KEY}:${f.id}`,
                    legacyChatGroups,
                )
                await AsyncStorage.removeItem(
                    `${CHAT_GROUPS_PERSISTENCE_KEY}:${f.id}`,
                )
            } else {
                console.info(
                    'No legacyChatGroups found',
                    `for fed ${f.id.slice(0, 10)}`,
                )
            }
        }
        migrateLegacyChatData()
    })
}
