import AsyncStorage from '@react-native-async-storage/async-storage'
import { Client, client, jid, xml } from '@xmpp/client'
import debug from '@xmpp/debug'
import XMPPError from '@xmpp/error'
import { JID } from '@xmpp/jid'
import { isEqual } from 'lodash'
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useReducer,
} from 'react'

import {
    COMMUNITY_GROUPS_PERSISTENCE_KEY,
    COMMUNITY_MEMBERS_PERSISTENCE_KEY,
    COMMUNITY_MESSAGES_PERSISTENCE_KEY,
    FEDI_GENERAL_CHANNEL_GROUP,
    FEDI_RECOVERY_SUPPORT_GROUP,
    XMPP_CONNECTION_OPTIONS,
    XMPP_DOMAIN,
    XMPP_MUC_DOMAIN,
    XMPP_RESOURCE,
} from '../../constants'
import i18n from '../../localization/i18n'
import { Group, Member, Message } from '../../types'
import { useFederationsContext } from './FederationsContext'

export const DEFAULT_GROUPS: Group[] = [
    FEDI_GENERAL_CHANNEL_GROUP,
    FEDI_RECOVERY_SUPPORT_GROUP,
]

// Define the structure of this Context and its initial state
interface CommunityContextState {
    xmppClient: Client | null
    authenticatedMember: Member | null
    username: string | null
    userIsOnline: boolean
    messages: Message[]
    groups: Group[]
    membersSeen: Member[]
}
const initialState: CommunityContextState = {
    xmppClient: null,
    username: null,
    userIsOnline: false,
    authenticatedMember: null,
    messages: [],
    groups: DEFAULT_GROUPS,
    membersSeen: [],
}
type AppState = typeof initialState

// Define actions that can change the state within this Context
enum ActionType {
    ADD_TO_MEMBERS_SEEN = 'ADD_TO_MEMBERS_SEEN',
    ADD_TO_MESSAGES = 'ADD_TO_MESSAGES',
    ADD_TO_GROUPS = 'ADD_TO_GROUPS',
    CHANGE_USER_IS_ONLINE = 'CHANGE_USER_IS_ONLINE',
    RECEIVE_MEMBERS_SEEN = 'RECEIVE_MEMBERS_SEEN',
    RECEIVE_MESSAGES = 'RECEIVE_MESSAGES',
    RECEIVE_GROUPS = 'RECEIVE_GROUPS',
    RESET_COMMUNITY_STATE = 'RESET_COMMUNITY_STATE',
    SET_AUTHENTICATED_MEMBER = 'SET_AUTHENTICATED_MEMBER',
    SET_XMPP_CLIENT = 'SET_XMPP_CLIENT',
    UPDATE_GROUP = 'UPDATE_GROUP',
    UPDATE_GROUP_MESSAGE_PREVIEW = 'UPDATE_GROUP_MESSAGE_PREVIEW',
    UPDATE_MEMBER = 'UPDATE_MEMBER',
    UPDATE_MESSAGE = 'UPDATE_MESSAGE',
    UPDATE_MEMBERS_SEEN = 'UPDATE_MEMBERS_SEEN',
}
interface Action {
    type: ActionType
    payload?: any
}

// Wrap with state and dispatch fields and create the Context
type BaseContext = {
    state: CommunityContextState
    dispatch: React.Dispatch<Action>
}
export const CommunityContext = createContext({} as BaseContext)

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
export function changeUserIsOnline(online: boolean): Action {
    return {
        type: ActionType.CHANGE_USER_IS_ONLINE,
        payload: online,
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
export function resetCommunityState(): Action {
    return {
        type: ActionType.RESET_COMMUNITY_STATE,
    }
}

// Implement the reducer with actions and state changes
export function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case ActionType.ADD_TO_MEMBERS_SEEN:
            const memberIndex = state.membersSeen.findIndex(
                (m: Member) => m.username === action.payload.username,
            )

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
                isEqual(action.payload, state.membersSeen[memberIndex])
                // action.payload.username === state.membersSeen[memberIndex].username
            ) {
                // Avoid re-render, this member is already added
                // and has not changed
                return state
            } else {
                // member is already added but something has changed...
                const updatedMember = {
                    ...state.messages[memberIndex],
                    ...action.payload,
                }
                return {
                    ...state,
                    membersSeen: state.membersSeen.map((m: Member, i) =>
                        i === memberIndex ? updatedMember : m,
                    ),
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
        case ActionType.CHANGE_USER_IS_ONLINE:
            return {
                ...state,
                userIsOnline: action.payload,
            }
        case ActionType.RECEIVE_MEMBERS_SEEN:
            return {
                ...state,
                membersSeen: [...action.payload].map(m => new Member(m)),
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
        case ActionType.SET_AUTHENTICATED_MEMBER:
            return {
                ...state,
                authenticatedMember: action.payload,
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
                // message needs an update...
                // TODO: Since XMPP sends all versions of a message as we update
                // the payment inside of it, check the payment.updatedAt value
                // and compare to see if we can skip a state update here
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
                    updatedGroup.lastReceivedTimestamp < newMessage.receivedAt!
                ) {
                    // update preview if this is the first message received or
                    // if there this is a newer message
                    updatedGroup = {
                        ...updatedGroup,
                        lastReceivedTimestamp: newMessage.receivedAt,
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
        case ActionType.RESET_COMMUNITY_STATE:
            return { ...initialState }
        default:
            return state
    }
}

// Creates an ephemeral XMPP client used solely for registration
// opens the stream and terminates on success or failure
export const registerXmppUser = async (
    username: string,
    password: string,
): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        // Connect to XMPP server without credentials to establish
        // a session for registration
        const xmppConnectionOptions = XMPP_CONNECTION_OPTIONS
        console.info(
            'registerXmppUser: xmppConnectionOptions',
            xmppConnectionOptions,
        )

        const xmpp = client(xmppConnectionOptions)
        debug(xmpp, true)

        // Send the registration request when the stream is opened
        xmpp.on('open', () => {
            xmpp.send(
                xml(
                    'iq',
                    { type: 'set', to: XMPP_DOMAIN, id: 'register' },
                    xml(
                        'query',
                        { xmlns: 'jabber:iq:register' },
                        xml('username', {}, username),
                        xml('password', {}, password),
                    ),
                ),
            )
        })

        // Listen for successful registration
        xmpp.on('stanza', async stanza => {
            // Receive a registration response from the server
            if (stanza.is('iq') && stanza.getAttr('id') === 'register') {
                // Shutdown the XMPP client (to be reinstantiated later)
                await xmpp.stop()
                xmpp.removeAllListeners()

                // Resolve or reject the promise based on registration response
                if (stanza.getAttr('type') === 'result') {
                    resolve(true)
                } else if (stanza.getAttr('type') === 'error') {
                    const error = stanza.getChild('error')
                    let errorMessage = i18n.t('errors.unknown-error')
                    if (error?.getChild('conflict')) {
                        errorMessage = i18n.t('errors.username-already-exists')
                    }

                    reject(errorMessage)
                }
            }
        })

        xmpp.start().catch(console.error)
    })
}

// Creates an ephemeral XMPP client used solely for authentication check
// opens the stream and terminates on success or failure
export const checkXmppUser = async (
    username: string,
    password: string,
): Promise<boolean> => {
    return new Promise(resolve => {
        // Connect to XMPP server with provided credentials to check
        // if the user exists
        const xmppConnectionOptions = {
            ...XMPP_CONNECTION_OPTIONS,
            username,
            password,
        }
        console.info(
            'checkXmppUser: xmppConnectionOptions',
            xmppConnectionOptions,
        )

        const xmpp = client(xmppConnectionOptions)
        debug(xmpp, true)

        // Listen for not-authorized error meaning the credentials are not valid
        xmpp.on('error', async (error: XMPPError) => {
            console.info('error', error)
            if (error.condition === 'not-authorized') {
                await xmpp.stop()
                xmpp.removeAllListeners()
                resolve(false)
            }
        })

        // Listen for successful online event meaning the credentials are valid
        xmpp.on('online', async () => {
            // Shutdown the XMPP client (to be reinstantiated later)
            // TODO: Refactor this to not require ephemeral clients
            await xmpp.stop()
            xmpp.removeAllListeners()
            resolve(true)
        })

        xmpp.start().catch(console.error)
    })
}

function CommunityProvider(props: React.PropsWithChildren<{}>) {
    const { state: federationsState, dispatch: federationsDispatch } =
        useFederationsContext()
    const { selectedFederationId, selectedFederation } = federationsState
    const [state, dispatch] = useReducer<React.Reducer<AppState, Action>>(
        reducer,
        initialState,
    )

    // useMemo makes sure the Provider only re-renders when
    // there is a state change
    const providerValue = useMemo(
        () => ({ state, dispatch }),
        [state, dispatch],
    )

    useEffect(() => {
        // Only attempt XMPP connection if there is a selectedFederation
        // and a username+password has been created for it
        if (selectedFederationId === null) return
        if (!selectedFederation?.username) return
        if (!selectedFederation?.password) return

        const xmppConnectionOptions = {
            ...XMPP_CONNECTION_OPTIONS,
            username: selectedFederation.username,
            password: selectedFederation.password,
        }
        console.info('xmppConnectionOptions', xmppConnectionOptions)

        const xmpp = client(xmppConnectionOptions)
        // debug(xmpp, true)

        // debug(xmpp, true, `OS=${Platform.OS}`)
        // This ^ helps debug when testing with both ios + android emulators
        // simultaneously to know which stanzas are coming from which device

        // requires that you edit @xmpp/debug/index.js in your
        // node_modules to accept a 3rd parameter and intercept the logs
        // you want to debug... for example:

        // @xmpp/debug/index.js
        // module.exports = function debug(entity, force, tag) {
        //     if (process.env.XMPP_DEBUG || force === true) {
        //       entity.on("element", (data) => {
        //         console.debug(`IN (${tag})\n${format(data)}`);
        //      ...

        // Monitor for incoming messages to add to state
        xmpp.on('stanza', async stanza => {
            try {
            if (stanza.is('presence')) {
                // ignore if there is no presence data
                const user = stanza.getChild('x')
                if (!user) return

                const statusCode = user?.getChild('status')?.getAttr('code')

                // This is a self-presence code, we don't
                // need to add to membersSeen
                if (statusCode === '110') return

                // Make sure this presence stanza came from the main domain
                // so we can create a member with the JID
                const from = stanza.getAttr('from')
                const fromJid = jid(from)
                let userJid: JID = fromJid

                // This came from a user through the MUC domain, reformat JID
                // to main domain with the /community resource
                if (fromJid.getDomain() === XMPP_MUC_DOMAIN) {
                    userJid = jid(
                        fromJid.getResource(),
                        XMPP_DOMAIN,
                        XMPP_RESOURCE,
                    )
                }

                dispatch(
                    addToMembersSeen(
                        new Member({
                            jid: userJid,
                        }),
                    ),
                )
            }
            if (stanza.is('message')) {
                if (stanza.getAttr('type') === 'groupchat') {
                    // Handle incoming messages from GroupChat
                    const bodyText = stanza.getChildText('body')
                    if (!bodyText) return

                    const groupMessageJson = stanza.getChildText('gm')
                        const parsedMessage = JSON.parse(
                            groupMessageJson as string,
                        )
                    const newMessage = new Message({
                        ...parsedMessage,
                        receivedAt: Date.now() / 1000,
                    })

                    dispatch(addToMessages(newMessage))
                    dispatch(updateGroupMessagePreview(newMessage))
                } else if (stanza.getAttr('type') === 'chat') {
                    // Handle incoming messages from DirectChat
                    const bodyText = stanza.getChildText('body')
                    if (!bodyText) return

                    const directMessageJson = stanza.getChildText('dm')
                    const parsedMessage = JSON.parse(
                        directMessageJson as string,
                    )
                    const newMessage = new Message({
                        ...parsedMessage,
                        receivedAt: Date.now() / 1000,
                    })

                    const action = stanza.getChild('action')
                    if (action?.getNS() === 'fedi:update-payment') {
                        // find message and replace with updated version
                        // with canceled or rejected payment
                        dispatch(updateMessage(newMessage))
                    } else {
                        dispatch(addToMessages(newMessage))
                        dispatch(updateGroupMessagePreview(newMessage))
                    }
                } else if (
                    stanza.getChild('result')?.getAttr('queryid') ===
                    'get-messages'
                ) {
                    // Handle messages received while offline, typically
                    // triggered by the fetchMessagesFromArchive hook
                    const result = stanza.getChild('result')
                    const forwarded = result?.getChild('forwarded')
                    const message = forwarded?.getChild('message')
                    if (!message) return

                    const directMessageJson = message.getChildText('dm')
                    const parsedMessage = JSON.parse(
                        directMessageJson as string,
                    )
                    const newMessage = new Message({
                        ...parsedMessage,
                        receivedAt: Date.now() / 1000,
                    })

                    const action = message.getChild('action')
                    if (action?.getNS() === 'fedi:update-payment') {
                        // find message and replace with updated version
                        // with canceled or rejected payment
                        dispatch(updateMessage(newMessage))
                    } else {
                        dispatch(addToMessages(newMessage))
                        dispatch(updateGroupMessagePreview(newMessage))
                    }
                }
                }
            } catch (error) {
                console.error('Error parsing XMPP stanza', error)
            }
        })

        // For updating the user's online status
        xmpp.on('offline', () => {
            dispatch(changeUserIsOnline(false))
        })
        xmpp.on('online', async _address => {
            // Send a presence message
            try {
                xmpp.send(xml('presence'))
            } catch (error) {
                console.error('Error sending XMPP presence', error)
            }

            dispatch(changeUserIsOnline(true))
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

        dispatch(setXmppClient(xmpp))
    }, [
        federationsDispatch,
        selectedFederationId,
        selectedFederation?.username,
        selectedFederation?.password,
    ])

    // Update async storage when groups are added
    useEffect(() => {
        if (state.groups.length > DEFAULT_GROUPS.length) {
            console.log('storing', state.groups.length, 'groups')
            AsyncStorage.setItem(
                COMMUNITY_GROUPS_PERSISTENCE_KEY,
                JSON.stringify({ groups: state.groups }),
            )
        }
    }, [state.groups])

    // Update async storage when members are added
    useEffect(() => {
        if (state.membersSeen.length > 0) {
            console.log('storing', state.membersSeen.length, 'members')
            AsyncStorage.setItem(
                COMMUNITY_MEMBERS_PERSISTENCE_KEY,
                JSON.stringify({ members: state.membersSeen }),
            )
        }
    }, [state.membersSeen])

    // Update async storage when messages are added
    useEffect(() => {
        if (state.messages.length > 0) {
            console.log('storing', state.messages.length, 'messages')
            AsyncStorage.setItem(
                COMMUNITY_MESSAGES_PERSISTENCE_KEY,
                JSON.stringify({ messages: state.messages }),
            )
        }
    }, [state.messages])

    return <CommunityContext.Provider value={providerValue} {...props} />
}

function useCommunityContext() {
    return useContext(CommunityContext)
}

export { CommunityProvider, useCommunityContext }
