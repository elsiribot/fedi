import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit'

import { CommonState, selectActiveFederation } from '.'
import {
    Chat,
    ChatMessage,
    ChatMember,
    ChatGroup,
    KeypairHex,
    ChatType,
    XmppCredentials,
} from '../types'

type FederationPayloadAction<T = {}> = PayloadAction<
    { federationId: string } & T
>

/*** Initial State ***/

const initialFederationChatState = {
    authenticatedMember: null as ChatMember | null,
    credentials: null as XmppCredentials | null,
    messages: [] as ChatMessage[],
    groups: [] as ChatGroup[],
    membersSeen: [] as ChatMember[],
    lastFetchedMessageId: null as string | null,
    websocketIsHealthy: false as boolean,
    encryptionKeys: null as KeypairHex | null,
}
type FederationChatState = typeof initialFederationChatState

// All chat state is keyed by federation id to keep federation chats separate, so it starts as an empty object.
const initialState = {} as Record<string, FederationChatState | undefined>

export type ChatState = typeof initialState

/*** Slice definition ***/

const getFederationChatState = (state: ChatState, federationId: string) =>
    state[federationId] || {
        ...initialFederationChatState,
    }

export const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setChatMembersSeen(
            state,
            action: FederationPayloadAction<{ membersSeen: ChatMember[] }>,
        ) {
            const { federationId, membersSeen } = action.payload
            state[federationId] = {
                ...getFederationChatState(state, federationId),
                membersSeen: [...membersSeen],
            }
        },
        addChatMemberSeen(
            state,
            action: FederationPayloadAction<{ member: ChatMember }>,
        ) {
            const { federationId, member } = action.payload
            const federation = getFederationChatState(state, federationId)
            // Don't add self to list
            if (member.id === federation.authenticatedMember?.id) return
            state[federationId] = {
                ...federation,
                membersSeen: [...federation.membersSeen, member],
            }
        },
        setChatMessages(
            state,
            action: FederationPayloadAction<{ messages: ChatMessage[] }>,
        ) {
            const { federationId, messages } = action.payload
            const federation = getFederationChatState(state, federationId)
            state[federationId] = {
                ...federation,
                messages,
            }
        },
        addChatMessage(
            state,
            action: FederationPayloadAction<{ message: ChatMessage }>,
        ) {
            const { federationId, message } = action.payload
            const federation = getFederationChatState(state, federationId)
            state[federationId] = {
                ...federation,
                // TODO: Upsert repeat messages
                messages: [...federation.messages, message],
            }
        },
        updateChatMessage(
            state,
            action: FederationPayloadAction<{ message: ChatMessage }>,
        ) {
            const { federationId, message } = action.payload
            const federation = getFederationChatState(state, federationId)
            const messages = federation.messages.map(m => {
                if (m.id !== message.id) return m
                return {
                    ...m,
                    ...message,
                }
            })
            state[federationId] = {
                ...federation,
                messages,
            }
        },
        setChatGroups(
            state,
            action: FederationPayloadAction<{ groups: ChatGroup[] }>,
        ) {
            const { federationId, groups } = action.payload
            const federation = getFederationChatState(state, federationId)
            state[federationId] = {
                ...federation,
                groups,
            }
        },
        addChatGroup(
            state,
            action: FederationPayloadAction<{ group: ChatGroup }>,
        ) {
            const { federationId, group } = action.payload
            const federation = getFederationChatState(state, federationId)
            state[federationId] = {
                ...federation,
                // TODO: Upsert repeat messages
                groups: [...federation.groups, group],
            }
        },
        setLastFetchedMessageId(
            state,
            action: FederationPayloadAction<{ lastFetchedMessageId: string }>,
        ) {
            const { federationId, lastFetchedMessageId } = action.payload
            const federation = getFederationChatState(state, federationId)
            state[federationId] = {
                ...federation,
                lastFetchedMessageId,
            }
        },
        setAuthenticatedMember(
            state,
            action: FederationPayloadAction<{
                authenticatedMember: ChatMember
            }>,
        ) {
            const { federationId, authenticatedMember } = action.payload
            const federation = getFederationChatState(state, federationId)
            state[federationId] = {
                ...federation,
                authenticatedMember,
            }
        },
        setChatEncryptionKeys(
            state,
            action: FederationPayloadAction<{ encryptionKeys: KeypairHex }>,
        ) {
            const { federationId, encryptionKeys } = action.payload
            const federation = getFederationChatState(state, federationId)
            state[federationId] = {
                ...federation,
                encryptionKeys,
            }
        },
        resetFederationChatState(state, action: FederationPayloadAction) {
            state[action.payload.federationId] = {
                ...initialFederationChatState,
            }
        },
        resetChatState() {
            return { ...initialState }
        },
    },
})

/*** Basic actions ***/

export const {
    setChatMembersSeen,
    addChatMemberSeen,
    setChatMessages,
    addChatMessage,
    updateChatMessage,
    setChatGroups,
    addChatGroup,
    setLastFetchedMessageId,
    setAuthenticatedMember,
    setChatEncryptionKeys,
    resetChatState,
} = chatSlice.actions

/*** Selectors ***/

const selectFederationChatState = (s: CommonState) =>
    getFederationChatState(s.chat, selectActiveFederation(s)?.id || '')

export const selectAuthenticatedMember = (s: CommonState) =>
    selectFederationChatState(s).authenticatedMember

export const selectAllChatMessages = (s: CommonState) =>
    selectFederationChatState(s).messages

export const selectAllChatMembers = (s: CommonState) =>
    selectFederationChatState(s).membersSeen

export const selectAllChatGroups = (s: CommonState) =>
    selectFederationChatState(s).groups

export const selectChatMemberMap = createSelector(
    selectAllChatMembers,
    members => {
        return members.reduce((prev, member) => {
            prev[member.id] = member
            return prev
        }, {} as Record<string, ChatMember | undefined>)
    },
)

export const selectChatMessages = createSelector(
    selectAuthenticatedMember,
    selectAllChatMessages,
    (_: CommonState, chatId: Chat['id']) => chatId,
    (me, messages, chatId) =>
        messages.filter(
            m =>
                m.sentIn === chatId ||
                m.sentBy === chatId ||
                (m.sentBy === me?.id && m.sentTo === chatId),
        ),
)

export const selectChatPreviewMessage = createSelector(
    selectChatMessages,
    (_: CommonState, chatId: Chat['id']) => chatId,
    (messages, chatId) => {
        return [...messages]
            .reverse()
            .find(m => m.sentIn === chatId || m.sentTo === chatId)
    },
)

export const selectChatMembers = createSelector(
    selectAllChatMembers,
    selectAllChatGroups,
    (_: CommonState, chatId: Chat['id']) => chatId,
    (members, groups, chatId) => {
        // If it's a group chat id, return the group's members
        const group = groups.find(g => g.id === chatId)
        if (group) {
            return group.members
                .map(memberId => members.find(m => m.id === memberId))
                .filter((m): m is ChatMember => !!m)
        }

        // If it's a member's id, return that member as a 1 length array
        const member = members.find(m => m.id === chatId)
        if (member) {
            return [member]
        }

        // Else return empty array
        return []
    },
)

export const selectAllDirectChats = createSelector(
    selectAuthenticatedMember,
    selectAllChatMessages,
    selectChatMemberMap,
    (me, messages, memberMap) => {
        const chatMap: Record<string, Chat> = {}
        messages.forEach(m => {
            const { sentTo, sentBy } = m

            // Filter out group messages
            if (!sentTo) return

            // Chat "id" is who it's with, determine based on if we or they sent
            const id = sentBy === me?.id ? sentTo : sentBy

            // Filter out members we haven't seen
            const member = memberMap[id]
            if (!member) return

            // Initialize chat object if it doesn't exist
            if (!chatMap[id]) {
                chatMap[id] = {
                    id,
                    name: id,
                    members: [id],
                    type: ChatType.direct,
                }
            }
        })
        return Object.values(chatMap)
    },
)

export const selectDirectChat = createSelector(
    selectAllDirectChats,
    (_: CommonState, memberId: string) => memberId,
    (directChats, memberId) => {
        return directChats.find(chat => chat.id === memberId)
    },
)
