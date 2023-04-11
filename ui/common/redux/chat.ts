import {
    createAsyncThunk,
    createSlice,
    PayloadAction,
    createSelector,
} from '@reduxjs/toolkit'

import { CommonState } from '.'
import {
    Chat,
    ChatMessage,
    ChatMember,
    ChatGroup,
    KeypairHex,
    ChatType,
} from '../types'

/*** Initial State ***/

const initialState = {
    authenticatedMember: null as ChatMember | null,
    username: null as string | null,
    messages: [] as ChatMessage[],
    groups: [] as ChatGroup[],
    membersSeen: [] as ChatMember[],
    lastFetchedMessageId: null as string | null,
    websocketIsHealthy: false,
    encryptionKeys: null as KeypairHex | null,
}

export type ChatState = typeof initialState

/*** Slice definition ***/

export const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setChatMembersSeen(state, action: PayloadAction<ChatMember[]>) {
            state.membersSeen = [...action.payload]
        },
        addChatMemberSeen(state, action: PayloadAction<ChatMember>) {
            // Don't add self to list
            if (action.payload.id === state.authenticatedMember?.id) return
            state.membersSeen = [...state.membersSeen, action.payload]
        },
        setChatMessages(state, action: PayloadAction<ChatMessage[]>) {
            state.messages = [...action.payload]
        },
        addChatMessage(state, action: PayloadAction<ChatMessage>) {
            // TODO: Upsert repeat messages
            state.messages = [...state.messages, action.payload]
        },
        updateChatMessage(state, action: PayloadAction<ChatMessage>) {
            state.messages = state.messages.map(m => {
                if (m.id !== action.payload.id) return m
                return {
                    ...m,
                    ...action.payload,
                }
            })
        },
        setChatGroups(state, action: PayloadAction<ChatGroup[]>) {
            state.groups = [...action.payload]
        },
        addChatGroup(state, action: PayloadAction<ChatGroup>) {
            // TODO: Upsert repeat groups
            state.groups = [...state.groups, action.payload]
        },
        setLastFetchedMessageId(state, action: PayloadAction<string>) {
            state.lastFetchedMessageId = action.payload
        },
        setAuthenticatedMember(state, action: PayloadAction<ChatMember>) {
            state.authenticatedMember = action.payload
        },
        setChatEncryptionKeys(state, action: PayloadAction<KeypairHex>) {
            state.encryptionKeys = action.payload
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

export const selectAuthenticatedMember = (s: CommonState) =>
    s.chat.authenticatedMember

export const selectAllChatMessages = (s: CommonState) => s.chat.messages

export const selectAllChatMembers = (s: CommonState) => s.chat.membersSeen

export const selectAllChatGroups = (s: CommonState) => s.chat.groups

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
            const { sentTo, sentBy, sentAt } = m

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
