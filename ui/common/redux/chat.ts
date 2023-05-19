import {
    createSlice,
    PayloadAction,
    createSelector,
    createAsyncThunk,
    ThunkDispatch,
    AnyAction,
    isAnyOf,
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
    ChatPayment,
    Keypair,
    ChatType,
    XmppCredentials,
    XmppClientStatus,
    ChatWithLatestMessage,
    ChatPaymentStatus,
} from '../types'
import encryptionUtils from '../utils/EncryptionUtils'
import {
    getFederationChatServerDomain,
    makeChatServerOptions,
} from '../utils/FederationUtils'
import { XmppChatClientManager } from '../utils/XmppChatClient'
import { FedimintBridge } from '../utils/fedimint'
import {
    checkXmppUser,
    decodeGroupInvitationLink,
    registerXmppUser,
} from '../utils/xmpp'
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
        setLastFetchedMessageId(
            state,
            action: FederationPayloadAction<{
                lastFetchedMessageId: FederationChatState['lastFetchedMessageId']
            }>,
        ) {
            const { federationId, lastFetchedMessageId } = action.payload
            const federation = getFederationChatState(state, federationId)
            state[federationId] = {
                ...federation,
                lastFetchedMessageId,
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

        builder.addCase(fetchChatHistory.fulfilled, (state, action) => {
            const { federationId } = action.meta.arg
            const federation = getFederationChatState(state, federationId)
            state[federationId] = {
                ...federation,
                lastFetchedMessageId: action.payload,
            }
        })

        builder.addCase(fetchChatMember.fulfilled, (state, action) => {
            return upsertEntityToChatState(
                state,
                action.meta.arg.federationId,
                'membersSeen',
                action.payload,
            )
        })

        builder.addCase(loadFromStorage.fulfilled, (state, action) => {
            if (!action.payload) return
            Object.entries(action.payload.chat).forEach(
                ([federationId, chatState]) => {
                    if (!chatState) return
                    state[federationId] = {
                        ...getFederationChatState(state, federationId),
                        authenticatedMember: chatState.authenticatedMember,
                        messages: chatState.messages,
                        groups: chatState.groups,
                        membersSeen: chatState.members,
                        lastFetchedMessageId: chatState.lastFetchedMessageId,
                    }
                },
            )
        })

        builder.addMatcher(
            isAnyOf(
                sendDirectMessage.fulfilled,
                sendGroupMessage.fulfilled,
                updateChatPayment.fulfilled,
            ),
            (state, action) => {
                return upsertEntityToChatState(
                    state,
                    action.meta.arg.federationId,
                    'messages',
                    action.payload,
                )
            },
        )

        builder.addMatcher(
            isAnyOf(
                joinChatGroup.fulfilled,
                createChatGroup.fulfilled,
                configureChatGroup.fulfilled,
            ),
            (state, action) => {
                return upsertEntityToChatState(
                    state,
                    action.meta.arg.federationId,
                    'groups',
                    action.payload,
                )
            },
        )
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
    setAuthenticatedMember,
    setChatEncryptionKeys,
    setLastFetchedMessageId,
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

        client.on('group', group => {
            dispatch(addChatGroup({ federationId, group }))
        })

        // On connection, update various states
        client.on('online', async () => {
            // Publish public key
            client
                .publishPublicKey(encryptionKeys.publicKey)
                .catch(err => console.error('Failed to publish public key'))

            // Fetch chat history
            dispatch(fetchChatHistory({ federationId }))

            // "Enter" every group we have in state
            chatState.groups.forEach(group => {
                client.enterGroup(group.id)
            })

            // Fix authenticatedMember if it has the wrong id or public key
            const jid = client.xmpp?.jid?.toString().split('/')[0]
            if (jid && authenticatedMember.id !== jid) {
                dispatch(
                    setAuthenticatedMember({
                        federationId,
                        authenticatedMember: {
                            ...authenticatedMember,
                            id: jid,
                            publicKeyHex: encryptionKeys.publicKey.hex,
                        },
                    }),
                )
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
    { federationId: string },
    { state: CommonState }
>('chat/fetchChatHistory', async ({ federationId }, { getState }) => {
    const client = xmppChatClientManager.getClient(federationId)
    let lastFetchedMessageId =
        getState().chat[federationId]?.lastFetchedMessageId || null

    // Keep requesting until we're totally caught up
    while (true) {
        const nextLastFetchedMessageId = await client.fetchMessageHistory(
            null,
            {
                limit: '10',
                after: lastFetchedMessageId || undefined,
            },
        )
        if (
            !nextLastFetchedMessageId ||
            nextLastFetchedMessageId === lastFetchedMessageId
        ) {
            break
        }
        lastFetchedMessageId = nextLastFetchedMessageId
    }

    return lastFetchedMessageId
})

export const fetchChatMembers = createAsyncThunk<
    ChatMember[],
    { federationId: string }
>('chat/fetchChatMembers', ({ federationId }) => {
    const client = xmppChatClientManager.getClient(federationId)
    return client.fetchMembers()
})

export const fetchChatMember = createAsyncThunk<
    ChatMember,
    { federationId: string; memberId: string },
    { state: CommonState }
>('chat/fetchChatMember', async ({ federationId, memberId }, { getState }) => {
    const client = xmppChatClientManager.getClient(federationId)
    const pubkey = await client.fetchMemberPublicKey(memberId)
    if (pubkey) {
        return {
            id: memberId,
            username: memberId.split('@')[0],
            publicKeyHex: pubkey,
        }
    } else {
        throw new Error('feature.chat.invalid-member')
    }
})

export const joinChatGroup = createAsyncThunk<
    ChatGroup,
    { federationId: string; link: string }
>('chat/joinChatGroup', async ({ federationId, link }) => {
    const groupId = decodeGroupInvitationLink(link)
    const client = xmppChatClientManager.getClient(federationId)
    const group = await client.joinGroup(groupId)
    return group
})

export const createChatGroup = createAsyncThunk<
    ChatGroup,
    { federationId: string; id: string; name: string }
>('chat/createChatGroup', async ({ federationId, id, name }) => {
    const client = xmppChatClientManager.getClient(federationId)
    const group = await client.createGroup(id, name)
    return group
})

export const configureChatGroup = createAsyncThunk<
    ChatGroup,
    { federationId: string; groupId: string; groupName: string },
    { state: CommonState }
>(
    'chat/configureChatGroup',
    async ({ federationId, groupId, groupName }, { getState }) => {
        const group = getState().chat[federationId]?.groups.find(
            g => g.id === groupId,
        )
        if (!group) throw new Error('No group found with that ID')

        const client = xmppChatClientManager.getClient(federationId)
        await client.configureGroup(groupId, groupName)

        return {
            ...group,
            name: groupName,
        }
    },
)

export const sendDirectMessage = createAsyncThunk<
    ChatMessage,
    | {
          fedimint: FedimintBridge
          federationId: string
          recipientId: string
      } & ({ content: string } | { payment: ChatPayment }),
    { state: CommonState }
>('chat/sendDirectMessage', async (args, { dispatch, getState }) => {
    const { fedimint, federationId, recipientId } = args
    const content = 'payment' in args ? 'fedi:payment-request:' : args.content
    let payment = 'payment' in args ? args.payment : undefined

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
    const sentAt = Date.now() / 1000
    if (payment) {
        payment = { ...payment, updatedAt: sentAt }
    }
    const message: ChatMessage = {
        content,
        payment,
        sentAt,
        id: uuidv4(),
        sentBy: authenticatedMember.id,
        sentTo: recipientId,
    }
    await client.sendDirectMessage(
        recipientId,
        recipientPubkey,
        message,
        encryptionKeys,
    )
    return message
})

export const sendGroupMessage = createAsyncThunk<
    ChatMessage,
    { federationId: string; groupId: string; content: string },
    { state: CommonState }
>(
    'chat/sendGroupMessage',
    async ({ federationId, groupId, content }, { getState }) => {
        const chatState = getState().chat[federationId]
        const client = xmppChatClientManager.getClient(federationId)

        // Get our username
        const authenticatedMember = chatState?.authenticatedMember
        if (!authenticatedMember) {
            throw new Error('errors.chat-unavailable')
        }

        // Get the group
        const group = chatState?.groups.find(g => g.id === groupId) || {
            id: groupId,
        }

        // Construct and send message
        const message: ChatMessage = {
            content,
            id: uuidv4(),
            sentAt: Date.now() / 1000,
            sentBy: authenticatedMember.id,
            sentIn: groupId,
        }
        await client.sendGroupMessage(group, message)
        return message
    },
)

export const updateChatPayment = createAsyncThunk<
    ChatMessage,
    {
        fedimint: FedimintBridge
        federationId: string
        messageId: string
        action: 'receive' | 'pay' | 'reject' | 'cancel'
    },
    { state: CommonState }
>(
    'chat/updateChatPayment',
    async (
        { fedimint, federationId, messageId, action },
        { getState, dispatch },
    ) => {
        const state = getState()
        const chatState = state.chat[federationId]
        const message = state.chat[federationId]?.messages.find(
            m => m.id === messageId,
        )
        const payment = message?.payment
        const recipientId = message?.sentTo
        if (!message || !payment || !recipientId)
            throw new Error('errors.chat-payment-failed')

        const client = xmppChatClientManager.getClient(federationId)

        // Get the recipient's pubkey, fetch it if we don't have it
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

        // Update payment depending on action
        let paymentUpdates: Partial<ChatPayment> = {
            updatedAt: Date.now() / 1000,
        }
        switch (action) {
            case 'receive': {
                const { token } = payment
                if (!token) throw new Error('errors.chat-payment-failed')

                try {
                    await fedimint.receiveEcash(token, federationId)
                } catch (err: any) {
                    if (
                        err &&
                        err.message.includes('already reissued these notes')
                    ) {
                        // No-op if we already claimed, just mark it as paid
                    } else {
                        throw err
                    }
                }
                paymentUpdates.token = null
                paymentUpdates.status = ChatPaymentStatus.paid
                break
            }
            case 'reject': {
                paymentUpdates.status = ChatPaymentStatus.rejected
                break
            }
            case 'pay': {
                const token = await fedimint.generateEcash(
                    payment.amount,
                    federationId,
                )
                paymentUpdates.token = token
                paymentUpdates.recipient = recipientId
                // Mark as accepted, not paid, they need to then redeem it
                paymentUpdates.status = ChatPaymentStatus.accepted
                break
            }
            case 'cancel': {
                // Redeem the token back for ourselves to avoid it being otherwise claimed
                const { token } = payment
                if (token) {
                    // TODO: Replace with cancel method? Receiving your own can be weird.
                    await fedimint.receiveEcash(token, federationId)
                }
                paymentUpdates.token = null
                paymentUpdates.status = ChatPaymentStatus.canceled
                break
            }
            default:
                throw new Error('errors.unknown-error')
        }

        // Send message as an update
        const updatedMessage = {
            ...message,
            payment: {
                ...payment,
                ...paymentUpdates,
            },
        }
        await client.updatePaymentMessage(
            updatedMessage,
            recipientPubkey,
            encryptionKeys,
        )

        return updatedMessage
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

export const selectChatClientStatus = (s: CommonState) =>
    selectFederationChatState(s).clientStatus

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
        return members.reduce<Record<string, ChatMember | undefined>>(
            (prev, member) => {
                prev[member.id] = member
                return prev
            },
            {},
        )
    },
)

export const selectChatGroupMap = createSelector(
    selectAllChatGroups,
    groups => {
        return groups.reduce<Record<string, ChatGroup | undefined>>(
            (prev, group) => {
                prev[group.id] = group
                return prev
            },
            {},
        )
    },
)

export const selectOrderedChatMessages = createSelector(
    selectAllChatMessages,
    messages => orderBy(messages, 'sentAt', 'desc'),
)

export const selectOrderedChatList = createSelector(
    selectOrderedChatMessages,
    selectChatMemberMap,
    selectChatGroupMap,
    selectAuthenticatedMember,
    (messages, memberMap, groupMap, me) => {
        const chatMap: Record<string, ChatWithLatestMessage> = {}
        messages.forEach(m => {
            const { sentTo, sentIn, sentBy } = m
            let id: string
            let name: string
            let type: ChatType
            let members: string[]

            if (sentTo) {
                type = ChatType.direct
                // Chat "id" is who it's with, determine based on if we or they sent
                id = sentBy === me?.id ? sentTo : sentBy

                // Filter out members we haven't seen, since we won't have enough
                // information to construct a chat.
                const member = memberMap[id]
                if (!member) return
                members = [id]
                name = member.username
            } else if (sentIn) {
                type = ChatType.group
                id = sentIn
                name = groupMap[id]?.name || 'Chat'
                members = []
            } else {
                // Should never happen?
                return
            }

            // Initialize chat object if it doesn't exist, otherwise just update
            // the latestMessage.
            if (!chatMap[id]) {
                chatMap[id] = {
                    id,
                    name,
                    members,
                    type,
                    latestMessage: m,
                }
            } else {
                chatMap[id] = {
                    ...chatMap[id],
                    members: [...chatMap[id].members, ...members],
                }
            }
        })
        return orderBy(
            Object.values(chatMap),
            c => c.latestMessage?.sentAt,
            'desc',
        )
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
                (m.sentBy === chatId && !m.sentIn) ||
                (m.sentBy === me?.id && m.sentTo === chatId),
        ),
)

export const selectChatMember = createSelector(
    selectAllChatMembers,
    (_: CommonState, memberId: string) => memberId,
    (chatMembers, memberId) => {
        return chatMembers.find(member => member.id === memberId)
    },
)

export const selectChatGroup = createSelector(
    selectAllChatGroups,
    (_: CommonState, groupId: string) => groupId,
    (chatGroups, groupId) => {
        return chatGroups.find(g => g.id === groupId)
    },
)

/**
 * Selects the XmppChatClient for the currently active federation.
 * Only returns the client if it is online and ready to send and receive
 * XMPP messages, otherwise return null.
 */
export const selectChatXmppClient = (s: CommonState) => {
    const activeFederation = selectActiveFederation(s)
    const status = selectChatClientStatus(s)
    if (!activeFederation || status !== 'online') return null
    return xmppChatClientManager.getClient(activeFederation.id)
}
