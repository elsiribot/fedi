import {
    createSlice,
    PayloadAction,
    createSelector,
    createAsyncThunk,
} from '@reduxjs/toolkit'

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
import FederationUtils from '../utils/FederationUtils'
import { FedimintBridge } from '../utils/fedimint'
import { checkXmppUser, registerXmppUser } from '../utils/xmpp'

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
    extraReducers: builder => {
        builder.addCase(refreshChatCredentials.fulfilled, (state, action) => {
            const { federationId } = action.meta.arg
            const federation = getFederationChatState(state, federationId)
            state[federationId] = {
                ...federation,
                credentials: action.payload,
            }
        })

        builder.addCase(authenticateChat.fulfilled, (state, action) => {
            const { federationId } = action.meta.arg
            const federation = getFederationChatState(state, federationId)
            state[federationId] = {
                ...federation,
                authenticatedMember: action.payload,
            }
        })
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
    resetFederationChatState,
    resetChatState,
} = chatSlice.actions

/*** Async thunk actions ***/

export const refreshChatCredentials = createAsyncThunk<
    XmppCredentials,
    { fedimint: FedimintBridge; federationId: string }
>('chat/refreshChatCredentials', async ({ fedimint, federationId }) => {
    const credentials = await fedimint.getXmppCredentials(federationId)
    return credentials
})

export const authenticateChat = createAsyncThunk<
    ChatMember,
    { fedimint: FedimintBridge; federationId: string; username: string },
    { state: CommonState }
>(
    'chat/authenticateChat',
    async ({ fedimint, federationId, username }, { dispatch, getState }) => {
        // Fetch xmpp credentials if we don't have them
        let credentials = getState().chat[federationId]?.credentials
        if (!credentials) {
            credentials = await dispatch(
                refreshChatCredentials({ fedimint, federationId }),
            ).unwrap()
        }
        const connectionOptions = selectChatConnectionOptions(getState())

        // Validate credentials, register if it's a new name
        const normalizedUsername = username.toLowerCase()
        const credentialsAreValid = await checkXmppUser(
            normalizedUsername,
            credentials.password,
            connectionOptions,
        )
        if (!credentialsAreValid) {
            await registerXmppUser(
                normalizedUsername,
                credentials.password,
                connectionOptions,
            )
        }

        // Backup the username to the fedimint bridge
        await fedimint.backupXmppUsername(normalizedUsername, federationId)

        return {
            id: normalizedUsername,
            username: normalizedUsername,
        }
    },
)

/*** Selectors ***/

const selectFederationChatState = (s: CommonState) =>
    getFederationChatState(s.chat, selectActiveFederation(s)?.id || '')

export const selectChatCredentials = (s: CommonState) =>
    selectFederationChatState(s).credentials

export const selectAuthenticatedMember = (s: CommonState) =>
    selectFederationChatState(s).authenticatedMember

export const selectAllChatMessages = (s: CommonState) =>
    selectFederationChatState(s).messages

export const selectAllChatMembers = (s: CommonState) =>
    selectFederationChatState(s).membersSeen

export const selectAllChatGroups = (s: CommonState) =>
    selectFederationChatState(s).groups

export const selectChatConnectionOptions = (s: CommonState) => {
    const activeFederation = selectActiveFederation(s)
    const chatOptions = new FederationUtils(
        activeFederation!,
    ).getChatServerOptions()

    return chatOptions
}

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
