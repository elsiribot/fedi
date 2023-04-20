import AsyncStorage from '@react-native-async-storage/async-storage'
import { Client, client, jid, xml } from '@xmpp/client'
import { JID } from '@xmpp/jid'
import parse from '@xmpp/xml/lib/parse'
import { isEqual } from 'lodash'
import { Element } from 'ltx'
import React, {
    createContext,
    MutableRefObject,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useRef,
} from 'react'
import { AppState as RNAppState, AppStateStatus } from 'react-native'

import {
    CHAT_GROUPS_PERSISTENCE_KEY,
    CHAT_MEMBERS_PERSISTENCE_KEY,
    CHAT_MESSAGES_PERSISTENCE_KEY,
    FEDI_GENERAL_CHANNEL_GROUP,
    XMPP_CONNECTION_OPTIONS,
    XMPP_DOMAIN,
    XMPP_MESSAGE_TYPES,
    XMPP_RESOURCE,
} from '../../constants'
import { Group, Key, Keypair, Member, Message } from '../../types'
import encryptionUtils from '../../utils/EncryptionUtils'
import { GetMessagesQuery } from '../../utils/XmlUtils'
import { publishPublicKey } from '../operations/chat'
import { useFederationsContext } from './FederationsContext'

export const DEFAULT_GROUPS: Group[] = [
    // FEDI_GENERAL_CHANNEL_GROUP,
    // FEDI_RECOVERY_SUPPORT_GROUP,
]

// Define the structure of this Context and its initial state
interface ChatContextState {
    xmppClient: Client | null
    authenticatedMember: Member | null
    username: string | null
    messages: Message[]
    groups: Group[]
    membersSeen: Member[]
    lastFetchedMessageId: string | null
    websocketIsHealthy: boolean
    encryptionKeys: Keypair | null
}
const initialState: ChatContextState = {
    xmppClient: null,
    username: null,
    authenticatedMember: null,
    messages: [],
    groups: DEFAULT_GROUPS,
    membersSeen: [],
    lastFetchedMessageId: null,
    websocketIsHealthy: false,
    encryptionKeys: null,
}
type AppState = typeof initialState

// Define actions that can change the state within this Context
enum ActionType {
    ADD_TO_MEMBERS_SEEN = 'ADD_TO_MEMBERS_SEEN',
    ADD_TO_MESSAGES = 'ADD_TO_MESSAGES',
    ADD_TO_GROUPS = 'ADD_TO_GROUPS',
    CHANGE_WEBSOCKET_IS_HEALTHY = 'CHANGE_WEBSOCKET_IS_HEALTHY',
    CHANGE_LAST_FETCHED_MESSAGE_ID = 'CHANGE_LAST_FETCHED_MESSAGE_ID',
    RECEIVE_MEMBERS_SEEN = 'RECEIVE_MEMBERS_SEEN',
    RECEIVE_MESSAGES = 'RECEIVE_MESSAGES',
    RECEIVE_GROUPS = 'RECEIVE_GROUPS',
    RESET_CHAT_STATE = 'RESET_CHAT_STATE',
    RESET_XMPP_CLIENT = 'RESET_XMPP_CLIENT',
    SET_AUTHENTICATED_MEMBER = 'SET_AUTHENTICATED_MEMBER',
    SET_ENCRYPTION_KEYS = 'SET_ENCRYPTION_KEYS',
    SET_XMPP_CLIENT = 'SET_XMPP_CLIENT',
    UPDATE_GROUP = 'UPDATE_GROUP',
    UPDATE_GROUP_MESSAGE_PREVIEW = 'UPDATE_GROUP_MESSAGE_PREVIEW',
    UPDATE_MEMBER = 'UPDATE_MEMBER',
    UPDATE_MESSAGE = 'UPDATE_MESSAGE',
    UPDATE_MEMBERS_SEEN = 'UPDATE_MEMBERS_SEEN',
}
export interface Action {
    type: ActionType
    payload?: any
}

// Wrap with state and dispatch fields and create the Context
type BaseContext = {
    state: ChatContextState
    dispatch: React.Dispatch<Action>
}
export const ChatContext = createContext({} as BaseContext)

// Export action creators as convenience functions to trigger state changes
export function addToMembersSeen(member: Member): Action {
    return {
        type: ActionType.ADD_TO_MEMBERS_SEEN,
        payload: member,
    }
}
export function addToMessages(message: Message): Action {
    return {
        type: ActionType.ADD_TO_MESSAGES,
        payload: message,
    }
}
export function addToGroups(group: Group): Action {
    return {
        type: ActionType.ADD_TO_GROUPS,
        payload: group,
    }
}
export function changeWebsocketIsHealthy(healthy: boolean): Action {
    return {
        type: ActionType.CHANGE_WEBSOCKET_IS_HEALTHY,
        payload: healthy,
    }
}
export function changeLastFetchedMessageId(messageId: string): Action {
    return {
        type: ActionType.CHANGE_LAST_FETCHED_MESSAGE_ID,
        payload: messageId,
    }
}
export function receiveMembersSeen(members: Member[]): Action {
    return {
        type: ActionType.RECEIVE_MEMBERS_SEEN,
        payload: members,
    }
}
export function receiveMessages(messages: Message[]): Action {
    return {
        type: ActionType.RECEIVE_MESSAGES,
        payload: messages,
    }
}
export function receiveGroups(groups: Group[]): Action {
    return {
        type: ActionType.RECEIVE_GROUPS,
        payload: groups,
    }
}
export function setAuthenticatedMember(member: Member): Action {
    return {
        type: ActionType.SET_AUTHENTICATED_MEMBER,
        payload: member,
    }
}
export function setEncryptionKeys(keys: Keypair): Action {
    return {
        type: ActionType.SET_ENCRYPTION_KEYS,
        payload: keys,
    }
}
export function setXmppClient(xmpp: Client): Action {
    return {
        type: ActionType.SET_XMPP_CLIENT,
        payload: xmpp,
    }
}
export function updateMessage(message: Message): Action {
    return {
        type: ActionType.UPDATE_MESSAGE,
        payload: message,
    }
}
export function updateGroupMessagePreview(message: Message): Action {
    return {
        type: ActionType.UPDATE_GROUP_MESSAGE_PREVIEW,
        payload: message,
    }
}
export function updateGroup(group: Group): Action {
    return {
        type: ActionType.UPDATE_GROUP,
        payload: group,
    }
}
export function updateMember(member: Member): Action {
    return {
        type: ActionType.UPDATE_MEMBER,
        payload: member,
    }
}
export function resetXmppClient(): Action {
    return {
        type: ActionType.RESET_XMPP_CLIENT,
    }
}
export function resetChatState(): Action {
    return {
        type: ActionType.RESET_CHAT_STATE,
    }
}

// Implement the reducer with actions and state changes
export function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case ActionType.ADD_TO_MEMBERS_SEEN: {
            const memberToAdd = new Member({ jid: action.payload.jid })
            const memberIndex = state.membersSeen.findIndex(
                (m: Member) => m.username === memberToAdd.username,
            )

            // don't add ourselves to membersSeen
            if (state.xmppClient?.jid?.getLocal() === memberToAdd.username) {
                return state
            }

            if (memberIndex === -1) {
                // New members get added
                return {
                    ...state,
                    membersSeen: [
                        ...state.membersSeen,
                        new Member(action.payload),
                    ],
                }
            } else if (
                // Should we deep compare or just use username?
                memberToAdd.username === state.membersSeen[memberIndex].username
            ) {
                // Avoid re-render, this member is already added
                // and has not changed
                return state
            } else {
                // member is already added but something has changed...
                const updatedMember = new Member({
                    ...state.membersSeen[memberIndex],
                    ...memberToAdd,
                })
                return {
                    ...state,
                    membersSeen: state.membersSeen.map((m: Member, i) =>
                        i === memberIndex ? updatedMember : m,
                    ),
                }
            }
        }
        case ActionType.ADD_TO_MESSAGES: {
            const messageIndex = state.messages.findIndex(
                (m: Message) => m.id === action.payload.id,
            )

            if (messageIndex === -1) {
                // New messages get added
                return {
                    ...state,
                    messages: [...state.messages, new Message(action.payload)],
                }
            } else if (
                // Should we deep compare or just use ID?
                // isEqual(action.payload, state.messages[messageIndex])
                action.payload.id === state.messages[messageIndex].id
            ) {
                // Avoid re-render, this message is already added
                // and has not changed
                return state
            } else {
                // message is already added but has changed...
                const updatedMessage = {
                    ...state.messages[messageIndex],
                    ...action.payload,
                }
                return {
                    ...state,
                    messages: state.messages.map((m: Message, i) =>
                        i === messageIndex ? updatedMessage : m,
                    ),
                }
            }
        }
        case ActionType.ADD_TO_GROUPS: {
            const groupIndex = state.groups.findIndex(
                (g: Group) => g.id === action.payload.id,
            )

            // Exclude default group from local store
            // use only for member discovery
            if (action.payload.id === FEDI_GENERAL_CHANNEL_GROUP.id) {
                return state
            }

            if (groupIndex === -1) {
                // New groups get added
                return {
                    ...state,
                    groups: [...state.groups, new Group(action.payload)],
                }
            } else if (
                // Should we deep compare or just use ID?
                // isEqual(action.payload, state.groups[groupIndex])
                action.payload.id === state.groups[groupIndex].id
            ) {
                // Avoid re-render, this group is already added
                // and has not changed
                return state
            } else {
                // group is already added but has changed...
                const updatedGroup = {
                    ...state.groups[groupIndex],
                    ...action.payload,
                }
                return {
                    ...state,
                    groups: state.groups.map((g: Group, i) =>
                        i === groupIndex ? updatedGroup : g,
                    ),
                }
            }
        }
        case ActionType.CHANGE_LAST_FETCHED_MESSAGE_ID:
            return {
                ...state,
                lastFetchedMessageId: action.payload,
            }
        case ActionType.CHANGE_WEBSOCKET_IS_HEALTHY:
            return {
                ...state,
                websocketIsHealthy: action.payload,
            }
        case ActionType.RECEIVE_MEMBERS_SEEN: {
            const incomingMembers = action.payload
            const newMembersSeen = incomingMembers
                .map(
                    (im: Member) =>
                        new Member({
                            ...im,
                            jid: im.jid,
                        }),
                )
                .filter((im: Member) => {
                    const memberExists = state.membersSeen.find(
                        (m: Member) => m.username === im.username,
                    )
                    if (
                        memberExists ||
                        // Never add ourselves to the roster
                        im.username === state.authenticatedMember?.username
                    ) {
                        return false
                    } else {
                        return true
                    }
                })
            // No new members received, avoid re-render
            if (newMembersSeen.length === 0) {
                return state
            }
            return {
                ...state,
                membersSeen: newMembersSeen.map((m: Member) => new Member(m)),
            }
        }
        case ActionType.RECEIVE_MESSAGES:
            return {
                ...state,
                messages: [...action.payload].map(m => new Message(m)),
            }
        case ActionType.RECEIVE_GROUPS:
            return {
                ...state,
                groups: [...action.payload].map(r => new Group(r)),
            }
        case ActionType.RESET_XMPP_CLIENT:
            return {
                ...state,
                xmppClient: initialState.xmppClient,
            }
        case ActionType.SET_AUTHENTICATED_MEMBER:
            return {
                ...state,
                authenticatedMember: action.payload,
            }
        case ActionType.SET_ENCRYPTION_KEYS:
            // Avoid unnecessary re-renders
            if (isEqual(action.payload, state.encryptionKeys)) {
                return state
            }
            return {
                ...state,
                encryptionKeys: action.payload,
            }
        case ActionType.SET_XMPP_CLIENT:
            return {
                ...state,
                xmppClient: action.payload,
            }
        case ActionType.UPDATE_MESSAGE: {
            const messageIndex = state.messages.findIndex(
                (m: Message) => m.id === action.payload.id,
            )

            if (messageIndex === -1) {
                // message not found, avoid re-render
                return state
            } else if (isEqual(action.payload, state.messages[messageIndex])) {
                // message exists but has not changed, avoid re-render
                return state
            } else {
                // message may need an update but we may already have the
                // most updated version of the embedded payment
                const currentPayment = state.messages[messageIndex].payment
                const newPayment = action.payload.payment
                if (currentPayment && newPayment) {
                    const currentTimestamp = currentPayment.updatedAt
                    const newTimestamp = newPayment.updatedAt

                    // There are no new updates to the payment so we can
                    // skip a state update
                    if (
                        currentTimestamp &&
                        newTimestamp &&
                        currentTimestamp >= newTimestamp
                    ) {
                        return state
                    }
                }
                // message should be updated...
                const updatedMessage = new Message({
                    ...state.messages[messageIndex],
                    ...action.payload,
                })
                return {
                    ...state,
                    messages: state.messages.map((m: Message, i) =>
                        i === messageIndex ? updatedMessage : m,
                    ),
                }
            }
        }
        case ActionType.UPDATE_GROUP_MESSAGE_PREVIEW: {
            const newMessage = action.payload as Message
            const groupIndex = state.groups.findIndex(
                (g: Group) => g.id === newMessage.sentIn?.id,
            )

            if (groupIndex === -1) {
                // Group not found, no state change
                return state
            } else {
                let updatedGroup = state.groups[groupIndex]

                if (
                    !updatedGroup.lastReceivedTimestamp ||
                    updatedGroup.lastReceivedTimestamp < newMessage.sentAt!
                ) {
                    // update preview if this is the first message received or
                    // if there this is a newer message
                    updatedGroup = {
                        ...updatedGroup,
                        lastReceivedTimestamp: newMessage.sentAt,
                        messagePreview: newMessage.content,
                    }
                    return {
                        ...state,
                        groups: state.groups.map((g: Group, i) =>
                            i === groupIndex ? updatedGroup : g,
                        ),
                    }
                } else {
                    // Already has latest message preview, no state change
                    return state
                }
            }
        }
        case ActionType.UPDATE_GROUP: {
            const groupIndex = state.groups.findIndex(
                (g: Group) => g.id === action.payload.id,
            )

            // Exclude default group from local store
            // use only for member discovery
            if (action.payload.id === FEDI_GENERAL_CHANNEL_GROUP.id) {
                return state
            }

            if (groupIndex === -1) {
                // New groups get added
                return {
                    ...state,
                    groups: [...state.groups, new Group(action.payload)],
                }
            } else if (isEqual(action.payload, state.groups[groupIndex])) {
                // Avoid re-render, this group has not changed
                return state
            } else {
                // group needs an update...
                const updatedGroup = {
                    ...state.groups[groupIndex],
                    ...action.payload,
                }
                return {
                    ...state,
                    groups: state.groups.map((g: Group, i) =>
                        i === groupIndex ? updatedGroup : g,
                    ),
                }
            }
        }
        case ActionType.UPDATE_MEMBER: {
            const memberToUpdate = action.payload
            const memberIndex = state.membersSeen.findIndex(
                (m: Member) => m.username === memberToUpdate.username,
            )

            // don't update ourselves
            if (state.xmppClient?.jid?.getLocal() === memberToUpdate.username) {
                return state
            }

            if (memberIndex === -1) {
                // New members get added
                return {
                    ...state,
                    membersSeen: [...state.membersSeen, memberToUpdate],
                }
            } else if (
                isEqual(memberToUpdate, state.membersSeen[memberIndex])
            ) {
                // Avoid re-render, this member has not changed
                return state
            } else {
                // member needs an update...
                const updatedMember = new Member({
                    ...state.membersSeen[memberIndex],
                    ...memberToUpdate,
                })
                return {
                    ...state,
                    membersSeen: state.membersSeen.map((m: Member, i) =>
                        i === memberIndex ? updatedMember : m,
                    ),
                }
            }
        }
        case ActionType.RESET_CHAT_STATE:
            return { ...initialState }
        default:
            return state
    }
}

function ChatProvider(props: React.PropsWithChildren<{}>) {
    const { state: federationsState, dispatch: federationsDispatch } =
        useFederationsContext()
    const { selectedFederationId, selectedFederation } = federationsState
    const [state, dispatch] = useReducer<React.Reducer<AppState, Action>>(
        reducer,
        initialState,
    )
    const appStateRef = useRef<AppStateStatus>(
        RNAppState.currentState,
    ) as MutableRefObject<AppStateStatus>

    // useMemo makes sure the Provider only re-renders when
    // there is a state change
    const providerValue = useMemo(
        () => ({ state, dispatch }),
        [state, dispatch],
    )

    // Takes a username + password to construct a new XMPP client
    // and store it in state for later use
    const buildXmppClient = useCallback(
        (username: string, password: string) => {
            try {
                const xmppConnectionOptions = {
                    ...XMPP_CONNECTION_OPTIONS,
                    username: username as string,
                    password: password as string,
                }
                console.info('xmppConnectionOptions', xmppConnectionOptions)

                const xmpp = client(xmppConnectionOptions)

                // debug(xmpp, true)
                // debug(xmpp, true, `OS=${Platform.OS}`)
                /*
                    This ^ helps debug when testing with both ios + android
                    emulators simultaneously to know which stanzas are coming
                    from which device

                    requires that you edit @xmpp/debug/index.js in your
                    node_modules to accept a 3rd parameter and intercept the logs
                    you want to debug... for example:

                    @xmpp/debug/index.js
                    module.exports = function debug(entity, force, tag) {
                        if (process.env.XMPP_DEBUG || force === true) {
                            entity.on("element", (data) => {
                                console.debug(`IN (${tag})\n${format(data)}`);
                            }
                        }
                    }
                    ...
                */

                xmpp.on('online', async _address => {
                    // Send a presence message
                    try {
                        xmpp.send(xml('presence'))
                    } catch (error) {
                        console.error('Error sending XMPP presence', error)
                    }

                    dispatch(changeWebsocketIsHealthy(true))
                    if (xmpp.jid) {
                        dispatch(
                            setAuthenticatedMember(
                                new Member({
                                    jid: jid(xmpp.jid.toString()),
                                }),
                            ),
                        )
                    }
                })

                xmpp.start().catch(console.error)

                // Store the xmppClient in state to be used throughout the app
                dispatch(setXmppClient(xmpp))
            } catch (error) {
                console.error('Failed to build XMPP client')
            }
        },
        [],
    )

    const resumeXmppStream = useCallback(() => {
        console.info('resuming xmpp stream after coming back into foreground')
        try {
            const xmppClient = state.xmppClient
            dispatch(changeWebsocketIsHealthy(false))

            // Sometimes we send a presence message and do not
            // get a response which may mean the stream cannot
            // be resumed so we need to stop and rebuild the client
            let reconnectTimer = setTimeout(() => {
                console.info(
                    'no response from XMPP server after 3s, rebuilding XMPP client',
                )
                state.xmppClient?.reconnect.stop()
                state.xmppClient?.stop()
                // this will re-trigger the XMPP instantiation effect above
                dispatch(resetXmppClient())
            }, 3000)
            // This expects a response to the presence message which means
            // the stream has been resumed successfully so we can clear
            // the reconnectTimer and cleanup the listener
            const onStanzaReceived = async (_: Element) => {
                dispatch(changeWebsocketIsHealthy(true))
                xmppClient?.removeListener('stanza', onStanzaReceived)
                console.info(
                    'XMPP server responded, do not rebuild XMPP client',
                )
                clearTimeout(reconnectTimer)
            }
            state.xmppClient?.on('stanza', onStanzaReceived)
            console.info(
                'sending presence to XMPP server to test for stable stream',
            )
            state.xmppClient?.send(xml('presence'))
        } catch (error) {
            console.error('Failed to resume XMPP stream')
        }
    }, [state.xmppClient])

    // This effect instantiates the XMPP client with a websocket connection
    // and requires a selectedFederation with username + password
    useEffect(() => {
        if (selectedFederationId === null) return
        // a username must be set before an XMPP connection is attempted
        // this should be set after creating a username for new members
        // or after recovering from backup for existing members
        if (!selectedFederation?.username) return
        // password is derived from seed after joining a federation
        if (!selectedFederation?.password) return

        // Only build an XMPP client if none exists in state
        if (state.xmppClient === null) {
            buildXmppClient(
                selectedFederation.username,
                selectedFederation.password,
            )
        }
    }, [
        buildXmppClient,
        federationsDispatch,
        selectedFederationId,
        selectedFederation?.username,
        selectedFederation?.password,
        state.xmppClient,
    ])

    const configureXmppMessageListeners = useCallback(() => {
        // Handlers for incoming messages
        const handleIncomingGroupMessage = (stanza: Element) => {
            const bodyText = stanza.getChildText('body')
            if (!bodyText) return

            const groupMessageJson = stanza.getChildText('gm')
            const parsedMessage = JSON.parse(groupMessageJson as string)
            if (!parsedMessage) return

            const newMessage = new Message({
                ...parsedMessage,
            })

            dispatch(addToMessages(newMessage))
            dispatch(updateGroupMessagePreview(newMessage))

            // This came from a user through the MUC domain, reformat JID
            // to main domain with the /chat resource
            const from = stanza.getAttr('from')
            const fromJid = jid(from)
            let userJid: JID = jid(
                fromJid.getResource(),
                XMPP_DOMAIN,
                XMPP_RESOURCE,
            )
            dispatch(addToMembersSeen(new Member({ jid: userJid })))
        }
        const handleIncomingDirectMessage = (stanza: Element) => {
            let newMessage, directMessageJson, parsedMessage, action
            const encrypted = stanza.getChild('encrypted')
            if (encrypted) {
                console.debug('encrypted', encrypted.toString())
                // First decrypt the payload
                const header = encrypted.getChild('header')
                const keys = header?.getChild('keys')
                const senderPublicKey = keys?.getChildText('key')

                let encryptedPayloadContents = encrypted.getChildText('payload')

                const { privateKey, publicKey } =
                    state.encryptionKeys as Keypair

                // If we sent this message, decrypt the backup-payload
                // instead since we encrypted it to our own pubkey
                if (senderPublicKey === publicKey.hex) {
                    encryptedPayloadContents =
                        encrypted.getChildText('backup-payload')
                }
                console.debug(
                    'encryptedPayloadContents',
                    encryptedPayloadContents,
                )
                const decryptedPayload = encryptionUtils.decryptMessage(
                    encryptedPayloadContents!,
                    new Key({ hex: senderPublicKey }),
                    privateKey,
                )

                console.debug('decryptedPayload', decryptedPayload)
                const decryptedEnvelope = parse(decryptedPayload)
                const content = decryptedEnvelope.getChild('content')
                directMessageJson = content.getChildText('dm')
                action = content.getChild('action')
            } else {
                // TODO: remove this... only left it in case it helps with
                // backwards compatibility
                directMessageJson = stanza.getChildText('dm')
                action = stanza.getChild('action')
            }

            parsedMessage = JSON.parse(directMessageJson as string)
            console.debug('parsedMessage', parsedMessage)
            if (!parsedMessage) return

            newMessage = new Message({
                ...parsedMessage,
            })

            if (action?.getNS() === 'fedi:update-payment') {
                // find message and replace with updated version
                // with canceled or rejected payment
                dispatch(updateMessage(newMessage))
            } else {
                dispatch(addToMessages(newMessage))
                dispatch(updateGroupMessagePreview(newMessage))

                const from = stanza.getAttr('from')
                const fromJid = jid(from)
                const userJid: JID = fromJid
                dispatch(addToMembersSeen(new Member({ jid: userJid })))
            }
        }
        const handleSubscriptionEvent = (stanza: Element) => {
            const event = stanza.getChild('event')

            const items = event?.getChild('items')
            const nodeId = items?.getAttr('node') as string

            const publishedItem = items?.getChild('item')
            const publisher = publishedItem?.getAttr('publisher')
            const publisherJid: JID = jid(publisher)
            const publishingMember = new Member({ jid: publisherJid })
            // if the node ID does not match the publisher JID... this pubkey
            // was not published by Fedi source code...
            // do not overwrite the locally stored pubkey for this member
            // TODO: implement signature validation for authentication?
            if (!nodeId.includes(publishingMember.username)) {
                console.error('node ID does not match the publisher JID')
                return
            }
            const pubkey = publishedItem?.getChildText('entry')
            console.info('pubkey', pubkey)
            publishingMember.publicKeyHex = pubkey as string
            console.info('publishingMember', publishingMember)

            dispatch(updateMember(publishingMember))
        }
        const handleIncomingMessageArchives = (stanza: Element) => {
            const result = stanza.getChild('result')
            const forwarded = result?.getChild('forwarded')
            const message = forwarded?.getChild('message')
            if (!message || message.getAttr('type') === 'error') return

            let newMessage, directMessageJson, parsedMessage, action
            const encrypted = message.getChild('encrypted')
            if (encrypted) {
                console.debug('encrypted', encrypted.toString())
                // First decrypt the payload
                const header = encrypted.getChild('header')
                const keys = header?.getChild('keys')
                const senderPublicKey = keys?.getChildText('key')

                let encryptedPayloadContents = encrypted.getChildText('payload')

                const { privateKey, publicKey } =
                    state.encryptionKeys as Keypair

                // If we sent this message, decrypt the backup-payload
                // instead since we encrypted it to our own pubkey
                if (senderPublicKey === publicKey.hex) {
                    encryptedPayloadContents =
                        encrypted.getChildText('backup-payload')
                }
                console.debug(
                    'encryptedPayloadContents',
                    encryptedPayloadContents,
                )
                const decryptedPayload = encryptionUtils.decryptMessage(
                    encryptedPayloadContents!,
                    new Key({ hex: senderPublicKey }),
                    privateKey,
                )

                console.log('decryptedPayload', decryptedPayload)
                const decryptedEnvelope = parse(decryptedPayload)
                const content = decryptedEnvelope.getChild('content')
                directMessageJson = content.getChildText('dm')
                action = content.getChild('action')
            } else {
                // TODO: remove this... only left it in case it helps with
                // backwards compatibility
                directMessageJson = message.getChildText('dm')
                action = message.getChild('action')
            }

            parsedMessage = JSON.parse(directMessageJson as string)
            if (!parsedMessage) return

            newMessage = new Message({
                ...parsedMessage,
            })

            if (action?.getNS() === 'fedi:update-payment') {
                // find message and replace with updated version
                // with canceled or rejected payment
                dispatch(updateMessage(newMessage))
            } else {
                dispatch(addToMessages(newMessage))
                dispatch(updateGroupMessagePreview(newMessage))

                const from = message.getAttr('from')
                const fromJid = jid(from)
                const userJid: JID = fromJid
                dispatch(addToMembersSeen(new Member({ jid: userJid })))
            }
        }

        // Listen for incoming messages
        const onStanzaReceived = async (stanza: Element) => {
            try {
                if (stanza.is('message')) {
                    switch (stanza.getAttr('type')) {
                        // Handle incoming messages from GroupChat
                        case XMPP_MESSAGE_TYPES.GROUPCHAT: {
                            handleIncomingGroupMessage(stanza)
                            break
                        }
                        // Handle incoming messages from DirectChat while online
                        case XMPP_MESSAGE_TYPES.CHAT: {
                            handleIncomingDirectMessage(stanza)
                            break
                        }
                        // Handle incoming messages after subscribing to user
                        // public key for e2e encryption
                        case XMPP_MESSAGE_TYPES.HEADLINE: {
                            handleSubscriptionEvent(stanza)
                            break
                        }
                        default:
                            break
                    }
                    // Handle messages received while offline, typically
                    // triggered by the fetchMessagesFromArchive hook
                    if (
                        stanza
                            .getChild('result')
                            ?.getAttr('queryid')
                            .includes(GetMessagesQuery.id)
                    ) {
                        handleIncomingMessageArchives(stanza)
                    }
                }
            } catch (error) {
                console.error('Error parsing XMPP stanza', error)
            }
        }
        console.info('setting onStanzaReceived lisetener')

        if (state.xmppClient && state.encryptionKeys) {
            state.xmppClient?.on('stanza', onStanzaReceived)
        }

        return () => {
            console.info('removeListener onStanzaReceived lisetener')
            state.xmppClient?.removeListener('stanza', onStanzaReceived)
        }
    }, [state.encryptionKeys, state.xmppClient])

    const configureXmppQueryListeners = useCallback(() => {
        // Monitor for incoming iq responses
        state.xmppClient?.on('stanza', async stanza => {
            try {
                if (stanza.is('iq')) {
                    // Needed for handling roster pushes from server
                    if (
                        stanza.getChild('query')?.getNS() === 'jabber:iq:roster'
                    ) {
                        const rosterItem = stanza
                            .getChild('query')
                            ?.getChild('item')
                        if (!rosterItem) return

                        const userJid = rosterItem?.getAttr('jid')

                        console.debug('received roster item', userJid)
                        dispatch(
                            addToMembersSeen(
                                new Member({
                                    jid: userJid,
                                }),
                            ),
                        )
                    }
                }
            } catch (error) {
                console.error('Error parsing XMPP stanza', error)
            }
        })
    }, [state.xmppClient])

    // This logic is needed to help gracefully resume the XMPP websocket stream
    useEffect(() => {
        if (state.xmppClient === null) return

        // Subscribe to changes in AppState to detect when app goes from
        // background to foreground
        const subscription = RNAppState.addEventListener(
            'change',
            nextAppState => {
                if (
                    appStateRef.current.match(/inactive|background/) &&
                    nextAppState === 'active'
                ) {
                    resumeXmppStream()
                }
                appStateRef.current = nextAppState
            },
        )
        return () => subscription.remove()
    }, [state.xmppClient, resumeXmppStream])

    // This effect adds event listeners to the xmppClient so it can react
    // to various kinds of XMPP stanzas sent by the server
    useEffect(() => {
        if (state.xmppClient !== null) {
            console.info('setting up XMPP listeners')
            configureXmppMessageListeners()
            configureXmppQueryListeners()
        }
    }, [
        configureXmppMessageListeners,
        configureXmppQueryListeners,
        state.xmppClient,
    ])

    // This effect derives a keypair when the keypair seed is returned
    // from the bridge and handled in FederationsContext
    useEffect(() => {
        if (selectedFederation?.keypairSeed) {
            const derivedKeypair = encryptionUtils.generateDeterministicKeyPair(
                selectedFederation.keypairSeed,
            )
            dispatch(setEncryptionKeys(derivedKeypair))
        }
    }, [selectedFederation?.keypairSeed])

    // This effect publishes the user's pubkey to the server so other users
    // can encrypt messages before sending
    useEffect(() => {
        if (
            state.xmppClient &&
            state.authenticatedMember &&
            state.encryptionKeys
        ) {
            const { publicKey } = state.encryptionKeys as Keypair
            publishPublicKey(publicKey, state.xmppClient)
        }
    }, [state.encryptionKeys, state.authenticatedMember, state.xmppClient])

    // These effects handle saving any state that should persist after the app
    // is killed by the OS
    // TODO: consider refactoring to use SQLite

    // Update async storage when groups are added
    useEffect(() => {
        if (state.groups.length > DEFAULT_GROUPS.length) {
            console.info('storing', state.groups.length, 'groups')
            AsyncStorage.setItem(
                CHAT_GROUPS_PERSISTENCE_KEY,
                JSON.stringify({ groups: state.groups }),
            )
        }
    }, [state.groups])
    // Update async storage when members are added
    useEffect(() => {
        if (state.membersSeen.length > 0) {
            console.info('storing', state.membersSeen.length, 'members')
            AsyncStorage.setItem(
                CHAT_MEMBERS_PERSISTENCE_KEY,
                JSON.stringify({ members: state.membersSeen }),
            )
        }
    }, [state.membersSeen])
    // Update async storage when messages are added
    useEffect(() => {
        if (state.messages.length > 0) {
            console.info('storing', state.messages.length, 'messages')
            AsyncStorage.setItem(
                CHAT_MESSAGES_PERSISTENCE_KEY,
                JSON.stringify({ messages: state.messages }),
            )
        }
    }, [state.messages])

    return <ChatContext.Provider value={providerValue} {...props} />
}

function useChatContext() {
    return useContext(ChatContext)
}

export { ChatProvider, useChatContext }
