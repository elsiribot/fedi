import {
    createSlice,
    PayloadAction,
    createSelector,
    createAsyncThunk,
    ThunkDispatch,
    AnyAction,
} from '@reduxjs/toolkit'
import isEqual from 'lodash/isEqual'
import orderBy from 'lodash/orderBy'
import { v4 as uuidv4 } from 'uuid'

import {
    CommonState,
    selectActiveFederation,
    selectFederationMetadata,
} from '.'
import {
    Chat,
    ChatMessage,
    ChatMember,
    ChatGroup,
    Keypair,
    ChatType,
    XmppCredentials,
    XmppClientStatus,
    ArchiveQueryFilters,
    ArchiveQueryPagination,
} from '../types'
import encryptionUtils from '../utils/EncryptionUtils'
import {
    getFederationChatServerDomain,
    makeChatServerOptions,
} from '../utils/FederationUtils'
import { XmppChatClientManager } from '../utils/XmppChatClient'
import { FedimintBridge } from '../utils/fedimint'
import { checkXmppUser, registerXmppUser } from '../utils/xmpp'
import { loadFromStorage } from './storage'

type FederationPayloadAction<T = {}> = PayloadAction<
    { federationId: string } & T
>

const xmppChatClientManager = new XmppChatClientManager()

/*** Initial State ***/

const initialFederationChatState = {
    clientStatus: 'disconnected' as XmppClientStatus,
    clientError: null as string | null,
    authenticatedMember: null as ChatMember | null,
    credentials: null as XmppCredentials | null,
    messages: [] as ChatMessage[],
    groups: [] as ChatGroup[],
    membersSeen: [] as ChatMember[],
    lastFetchedMessageId: null as string | null,
    encryptionKeys: null as Keypair | null,
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

const upsertEntityToChatState = <
    K extends 'messages' | 'groups' | 'membersSeen',
    T extends FederationChatState[K][0],
>(
    state: ChatState,
    federationId: string,
    key: K,
    newEntity: T,
): ChatState => {
    let addToEnd = true
    let wasEqual = false
    const chatState = getFederationChatState(state, federationId)

    // Make a new list of entities with the new one updating the old one. Make
    // note of if we find it (don't need to append) and if it was identical
    // (don't need to update state at all.)
    const entities = chatState[key].map(oldEntity => {
        if (oldEntity.id !== newEntity.id) return oldEntity
        if (oldEntity.id === newEntity.id) {
            addToEnd = false
            const updatedEntity = { ...oldEntity, ...newEntity }
            wasEqual = isEqual(oldEntity, updatedEntity)
            return updatedEntity
        }
    })

    // If we went to update the old entity but found that it was equal to the new entity, we can return state
    // exactly as it was and prevent unnecessary updates.
    if (!addToEnd && wasEqual) {
        return state
    }

    // If we didn't find the old one in the list, add the new one to the end of the list
    if (addToEnd) {
        entities.push(newEntity)
    }

    // Return updated state
    return {
        ...state,
        [federationId]: {
            ...chatState,
            [key]: entities,
        },
    }
}

export const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setChatClientStatus(
            state,
            action: FederationPayloadAction<{ status: XmppClientStatus }>,
        ) {
            const { federationId, status } = action.payload
            const chatState = getFederationChatState(state, federationId)
            state[federationId] = {
                ...chatState,
                clientStatus: status,
                // Reset error on successful connection
                clientError: status === 'online' ? null : chatState.clientError,
            }
        },
        setChatClientError(
            state,
            action: FederationPayloadAction<{ error: string }>,
        ) {
            const { federationId, error } = action.payload
            state[federationId] = {
                ...getFederationChatState(state, federationId),
                clientError: error,
            }
        },
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
            return upsertEntityToChatState(
                state,
                federationId,
                'membersSeen',
                member,
            )
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
            return upsertEntityToChatState(
                state,
                federationId,
                'messages',
                message,
            )
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
            return upsertEntityToChatState(state, federationId, 'groups', group)
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
            action: FederationPayloadAction<{ encryptionKeys: Keypair }>,
        ) {
            const { federationId, encryptionKeys } = action.payload
            const federation = getFederationChatState(state, federationId)
            state[federationId] = {
                ...federation,
                encryptionKeys,
            }
        },
        resetAuthenticatedMember(state, action: FederationPayloadAction<{}>) {
            const { federationId } = action.payload
            const federation = getFederationChatState(state, federationId)
            state[federationId] = {
                ...federation,
                authenticatedMember:
                    initialFederationChatState.authenticatedMember,
                encryptionKeys: initialFederationChatState.encryptionKeys,
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
                ...action.payload,
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

        builder.addCase(sendDirectMessage.fulfilled, (state, action) => {
            return upsertEntityToChatState(
                state,
                action.meta.arg.federationId,
                'messages',
                action.payload,
            )
        })

        builder.addCase(sendGroupMessage.fulfilled, (state, action) => {
            return upsertEntityToChatState(
                state,
                action.meta.arg.federationId,
                'messages',
                action.payload,
            )
        })

        builder.addCase(loadFromStorage.fulfilled, (state, action) => {
            if (!action.payload) return
            Object.entries(action.payload.chatIdentities).forEach(
                ([federationId, chatIdentity]) => {
                    if (!chatIdentity) return
                    state[federationId] = {
                        ...getFederationChatState(state, federationId),
                        authenticatedMember: chatIdentity,
                    }
                },
            )
        })
    },
})

/*** Basic actions ***/

export const {
    setChatClientStatus,
    setChatClientError,
    setChatMembersSeen,
    addChatMemberSeen,
    setChatMessages,
    addChatMessage,
    setChatGroups,
    addChatGroup,
    setLastFetchedMessageId,
    setAuthenticatedMember,
    setChatEncryptionKeys,
    resetAuthenticatedMember,
    resetFederationChatState,
    resetChatState,
} = chatSlice.actions

/*** Async thunk actions ***/

export const refreshChatCredentials = createAsyncThunk<
    { credentials: XmppCredentials; encryptionKeys: Keypair },
    { fedimint: FedimintBridge; federationId: string }
>('chat/refreshChatCredentials', async ({ fedimint, federationId }) => {
    const credentials = await fedimint.getXmppCredentials(federationId)
    const encryptionKeys = encryptionUtils.generateDeterministicKeyPair(
        credentials.keypairSeed,
    )
    return { credentials, encryptionKeys }
})

export const authenticateChat = createAsyncThunk<
    ChatMember,
    {
        fedimint: FedimintBridge
        federationId: string
        username: string
        forceCredentialRefresh?: boolean
    },
    { state: CommonState }
>(
    'chat/authenticateChat',
    async (
        { fedimint, federationId, username, forceCredentialRefresh },
        { dispatch, getState },
    ) => {
        // Fetch xmpp credentials if we don't have them
        let credentials = getState().chat[federationId]?.credentials
        if (forceCredentialRefresh || !credentials) {
            credentials = (
                await dispatch(
                    refreshChatCredentials({ fedimint, federationId }),
                ).unwrap()
            ).credentials
        }

        const connectionOptions = selectChatConnectionOptions(getState())
        if (connectionOptions === null) {
            console.error('No chat connectionOptions for this federation')
            throw new Error('errors.chat-unavailable')
        }

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

export const connectChat = createAsyncThunk<
    void,
    { fedimint: FedimintBridge; federationId: string },
    { state: CommonState }
>(
    'chat/connectChat',
    async ({ fedimint, federationId }, { getState, dispatch }) => {
        // Assemble all necessary state for starting chat, throw if we are missing anything.
        const state = getState()
        const chatState = state.chat[federationId]
        const federation = state.federation.federations.find(
            f => f.id === federationId,
        )

        if (!federation) {
            console.error(
                `No federation found with id ${federationId}, cannot start chat`,
            )
            throw new Error('errors.chat-unavailable')
        }

        const chatDomain = getFederationChatServerDomain(federation.meta)
        if (!chatDomain) {
            console.info(`No chat domain configured for ${federationId}`)
            throw new Error('errors.chat-unavailable')
        }

        const authenticatedMember = chatState?.authenticatedMember
        if (!authenticatedMember) {
            console.warn(
                `No chat member informations was found for ${federationId}, cannot start chat`,
            )
            throw new Error('errors.chat-unavailable')
        }

        // Fetch xmpp credentials if we don't have them
        const { credentials, encryptionKeys } = await getOrFetchCredentials(
            fedimint,
            federationId,
            state,
            dispatch,
        )

        // Get client & bind listeners to dispatch actions
        const client = xmppChatClientManager.getClient(federationId)

        client.on('status', async status => {
            dispatch(setChatClientStatus({ federationId, status }))
        })

        client.on('error', error => {
            dispatch(setChatClientError({ federationId, error: error.message }))
        })

        client.on('message', message => {
            dispatch(addChatMessage({ federationId, message }))
        })

        client.on('memberSeen', member => {
            dispatch(addChatMemberSeen({ federationId, member }))
        })

        // On first availability, publish pubkey
        let hasPublishedPubkey = false
        client.on('online', async () => {
            if (!hasPublishedPubkey) {
                try {
                    hasPublishedPubkey = true
                    await client.publishPublicKey(encryptionKeys.publicKey)
                } catch (err) {
                    console.error('Failed to publish public key', err)
                    hasPublishedPubkey = false
                }
            }
        })

        // Start the client
        const connectionOptions = makeChatServerOptions(chatDomain)
        client.start(
            {
                domain: connectionOptions.domain,
                service: connectionOptions.service,
                resource: connectionOptions.resource,
                username: authenticatedMember.username,
                password: credentials.password,
            },
            encryptionKeys,
        )
    },
)

export const disconnectChat = createAsyncThunk<void, { federationId: string }>(
    'chat/disconnectChat',
    async ({ federationId }) => {
        await xmppChatClientManager.destroyClient(federationId)
    },
)

export const fetchChatHistory = createAsyncThunk<
    string | null,
    {
        federationId: string
        filters?: ArchiveQueryFilters
        pagination?: ArchiveQueryPagination
    }
>(
    'chat/fetchChatHistory',
    ({ federationId, filters = null, pagination = null }) => {
        const client = xmppChatClientManager.getClient(federationId)
        return client.fetchMessageHistory(filters, pagination)
    },
)

export const fetchChatMembers = createAsyncThunk<
    ChatMember[],
    { federationId: string }
>('chat/fetchChatMembers', ({ federationId }) => {
    const client = xmppChatClientManager.getClient(federationId)
    return client.fetchMembers()
})

export const joinChatGroup = createAsyncThunk<
    void,
    { federationId: string; groupId: string }
>('chat/joinChatGroup', ({ federationId, groupId }) => {
    const client = xmppChatClientManager.getClient(federationId)
    return client.joinGroup(groupId)
})

export const configureChatGroup = createAsyncThunk<
    void,
    { federationId: string; groupId: string; groupName: string }
>('chat/editChatGroup', ({ federationId, groupId, groupName }) => {
    const client = xmppChatClientManager.getClient(federationId)
    return client.configureGroup(groupId, groupName)
})

export const sendDirectMessage = createAsyncThunk<
    ChatMessage,
    {
        fedimint: FedimintBridge
        federationId: string
        recipientId: string
        content: string
        updatePayment?: boolean
    },
    { state: CommonState }
>(
    'chat/sendDirectMessage',
    async (
        { fedimint, federationId, recipientId, content, updatePayment },
        { dispatch, getState },
    ) => {
        const state = getState()
        const client = xmppChatClientManager.getClient(federationId)

        // Get the recipient's pubkey, fetch it if we don't have it
        const chatState = state.chat[federationId]
        const recipientMember = chatState?.membersSeen.find(
            m => m.id === recipientId,
        )
        let recipientPubkey: string
        if (recipientMember?.publicKeyHex) {
            recipientPubkey = recipientMember?.publicKeyHex
        } else {
            recipientPubkey = await client.fetchMemberPublicKey(recipientId)
        }

        // Get or fetch credentials
        const { encryptionKeys } = await getOrFetchCredentials(
            fedimint,
            federationId,
            state,
            dispatch,
        )

        // Get our username
        const authenticatedMember = chatState?.authenticatedMember
        if (!authenticatedMember) {
            throw new Error('errors.chat-unavailable')
        }

        // Construct and send message
        const message: ChatMessage = {
            content,
            id: uuidv4(),
            sentAt: Date.now(),
            sentBy: authenticatedMember.id,
            sentTo: recipientId,
        }
        await client.sendDirectMessage(
            recipientId,
            recipientPubkey,
            message,
            encryptionKeys,
            updatePayment,
        )
        return message
    },
)

export const sendGroupMessage = createAsyncThunk<
    ChatMessage,
    { federationId: string; groupId: string; content: string },
    { state: CommonState }
>(
    'chat/sendGroupMessage',
    async ({ federationId, groupId, content }, { getState }) => {
        const client = xmppChatClientManager.getClient(federationId)

        // Get our username
        const authenticatedMember =
            getState().chat[federationId]?.authenticatedMember
        if (!authenticatedMember) {
            throw new Error('errors.chat-unavailable')
        }

        // Construct and send message
        const message: ChatMessage = {
            content,
            id: uuidv4(),
            sentAt: Date.now(),
            sentBy: authenticatedMember.id,
            sentTo: groupId,
        }
        await client.sendGroupMessage(groupId, message)
        return message
    },
)

// Async thunk utility functions

async function getOrFetchCredentials(
    fedimint: FedimintBridge,
    federationId: string,
    state: CommonState,
    dispatch: ThunkDispatch<CommonState, unknown, AnyAction>,
) {
    const chatState = state.chat[federationId]
    let credentials: XmppCredentials
    let encryptionKeys: Keypair
    if (chatState?.credentials && chatState?.encryptionKeys) {
        credentials = chatState.credentials
        encryptionKeys = chatState.encryptionKeys
    } else {
        const res = await dispatch(
            refreshChatCredentials({ fedimint, federationId }),
        ).unwrap()
        credentials = res.credentials
        encryptionKeys = res.encryptionKeys
    }
    return { credentials, encryptionKeys }
}

/*** Selectors ***/

const selectFederationChatState = (s: CommonState) =>
    getFederationChatState(s.chat, selectActiveFederation(s)?.id || '')

export const selectChatCredentials = (s: CommonState) =>
    selectFederationChatState(s).credentials

export const selectChatEncryptionKeys = (s: CommonState) =>
    selectFederationChatState(s).encryptionKeys

export const selectAuthenticatedMember = (s: CommonState) =>
    selectFederationChatState(s).authenticatedMember

export const selectAllChatMessages = (s: CommonState) =>
    selectFederationChatState(s).messages

export const selectAllChatMembers = (s: CommonState) =>
    selectFederationChatState(s).membersSeen

export const selectAllChatGroups = (s: CommonState) =>
    selectFederationChatState(s).groups

export const selectLastFetchedMessageId = (s: CommonState) =>
    selectFederationChatState(s).lastFetchedMessageId

export const selectChatConnectionOptions = createSelector(
    (s: CommonState) => {
        const activeFederationMetadata = selectFederationMetadata(s)
        return activeFederationMetadata
    },
    metadata => {
        const chatServerDomain = getFederationChatServerDomain(metadata)
        return chatServerDomain
            ? makeChatServerOptions(chatServerDomain as string)
            : null
    },
)

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

export const selectChatLatestMessage = createSelector(
    selectChatMessages,
    (_: CommonState, chatId: Chat['id']) => chatId,
    messages => {
        return [...orderBy(messages, 'sentAt', 'desc')][0]
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

export const selectChatMember = createSelector(
    selectChatMembers,
    (_: CommonState, memberId: string) => memberId,
    (chatMembers, memberId) => {
        return chatMembers.find(member => member.id === memberId)
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
