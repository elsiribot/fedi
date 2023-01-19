import AsyncStorage from '@react-native-async-storage/async-storage'
import { Client, client, Options, xml } from '@xmpp/client'
import debug from '@xmpp/debug'
import { isEqual } from 'lodash'
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useReducer,
} from 'react'

import { Images } from '../../assets/images'
import {
    COMMUNITY_MESSAGES_PERSISTENCE_KEY,
    COMMUNITY_ROOMS_PERSISTENCE_KEY,
} from '../../constants'
import i18n from '../../localization/i18n'
import { Member, Message, Room } from '../../types'
import { useEnvironmentContext } from './EnvironmentContext'
import { useFederationsContext } from './FederationsContext'

export const MOCKED_ROOMS: Room[] = [
    {
        id: 'fedi-general-channel',
        icon: Images.FediLogoIcon,
        name: 'Fedi',
        pinned: true,
        hasNewMessages: true,
        lastReceivedTimestamp: Date.now() / 1000 - 172800, // 2 days ago
        messagePreview:
            'Welcome to Fedi! This channel will keep you up to date on events happening within your Fedi app',
        lastMessage: {
            timestamp: Date.now() / 1000 - 172800, // 2 days ago
            text: 'Welcome to Fedi! This channel will keep you up to date on events happening within your Fedi app such as:<br><br>- Federation health checks<br>- Scam awareness<br>- Security checks<br>- App updates<br>- Tips & tricks<br>- Education',
        },
    },
    {
        id: 'fedi-recovery-support',
        icon: Images.Recovery,
        name: 'Recovery Support',
        pinned: false,
        hasNewMessages: false,
        lastReceivedTimestamp: Date.now() / 1000,
        messagePreview:
            'Could someone please help me get in touch with a guardian so I can',
        lastMessage: {
            timestamp: Date.now() / 1000,
            text: 'Could someone please help me get in touch with a guardian so I can recover my funds??? My phone was stolen it is urgent!',
        },
    },
]

// Define the structure of this Context and its initial state
interface CommunityContextState {
    xmppClient: Client | null
    authenticatedMember: Member | null
    username: string | null
    userIsOnline: boolean
    messages: Message[]
    rooms: Room[]
    membersSeen: Member[]
}
const initialState: CommunityContextState = {
    xmppClient: null,
    username: null,
    userIsOnline: false,
    authenticatedMember: null,
    messages: [],
    rooms: MOCKED_ROOMS,
    membersSeen: [],
}
type AppState = typeof initialState

// Define actions that can change the state within this Context
enum ActionType {
    ADD_TO_MESSAGES = 'ADD_TO_MESSAGES',
    ADD_TO_ROOMS = 'ADD_TO_ROOMS',
    CHANGE_USER_IS_ONLINE = 'CHANGE_USER_IS_ONLINE',
    RECEIVE_MESSAGES = 'RECEIVE_MESSAGES',
    RECEIVE_ROOMS = 'RECEIVE_ROOMS',
    RESET_COMMUNITY_STATE = 'RESET_COMMUNITY_STATE',
    SET_AUTHENTICATED_MEMBER = 'SET_AUTHENTICATED_MEMBER',
    SET_XMPP_CLIENT = 'SET_XMPP_CLIENT',
    UPDATE_ROOM = 'UPDATE_ROOM',
    UPDATE_ROOM_MESSAGE_PREVIEW = 'UPDATE_ROOM_MESSAGE_PREVIEW',
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
export function addToMessages(message: Message): Action {
    return {
        type: ActionType.ADD_TO_MESSAGES,
        payload: message,
    }
}
export function addToRooms(room: Room): Action {
    return {
        type: ActionType.ADD_TO_ROOMS,
        payload: room,
    }
}
export function changeUserIsOnline(online: boolean): Action {
    return {
        type: ActionType.CHANGE_USER_IS_ONLINE,
        payload: online,
    }
}
export function receiveMessages(messages: Message[]): Action {
    return {
        type: ActionType.RECEIVE_MESSAGES,
        payload: messages,
    }
}
export function receiveRooms(rooms: Room[]): Action {
    return {
        type: ActionType.RECEIVE_ROOMS,
        payload: rooms,
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
export function updateRoomMessagePreview(message: Message): Action {
    return {
        type: ActionType.UPDATE_ROOM_MESSAGE_PREVIEW,
        payload: message,
    }
}
export function updateRoom(room: Room): Action {
    return {
        type: ActionType.UPDATE_ROOM,
        payload: room,
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
        case ActionType.ADD_TO_ROOMS: {
            const roomIndex = state.rooms.findIndex(
                (r: Room) => r.id === action.payload.id,
            )

            if (roomIndex === -1) {
                // New rooms get added
                return {
                    ...state,
                    rooms: [...state.rooms, new Room(action.payload)],
                }
            } else if (
                // Should we deep compare or just use ID?
                // isEqual(action.payload, state.rooms[roomIndex])
                action.payload.id === state.rooms[roomIndex].id
            ) {
                // Avoid re-render, this room is already added
                // and has not changed
                return state
            } else {
                // room is already added but has changed...
                const updatedRoom = {
                    ...state.rooms[roomIndex],
                    ...action.payload,
                }
                return {
                    ...state,
                    rooms: state.rooms.map((r: Room, i) =>
                        i === roomIndex ? updatedRoom : r,
                    ),
                }
            }
        }
        case ActionType.ADD_TO_MESSAGES:
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
        case ActionType.CHANGE_USER_IS_ONLINE:
            return {
                ...state,
                userIsOnline: action.payload,
            }
        case ActionType.RECEIVE_MESSAGES:
            return {
                ...state,
                messages: [...action.payload],
            }
        case ActionType.RECEIVE_ROOMS:
            console.info('RECEIVE_ROOMS.rooms', action.payload)
            return {
                ...state,
                rooms: [...action.payload],
            }
        case ActionType.SET_AUTHENTICATED_MEMBER:
            return {
                ...state,
                authenticatedMember: action.payload,
            }
        case ActionType.SET_XMPP_CLIENT:
            // Stop the existing xmppClient before overwriting it
            // This may not be necessary???
            // try {
            //     state.xmppClient?.stop()
            // } catch (error) {
            //     console.error(error)
            // }

            return {
                ...state,
                xmppClient: action.payload,
            }
        case ActionType.UPDATE_ROOM_MESSAGE_PREVIEW: {
            const newMessage = action.payload as Message
            const roomIndex = state.rooms.findIndex(
                (r: Room) => r.id === newMessage.sentIn?.id,
            )

            if (roomIndex === -1) {
                // Room not found, no state change
                return state
            } else {
                let updatedRoom = state.rooms[roomIndex]

                if (
                    !updatedRoom.lastReceivedTimestamp ||
                    updatedRoom.lastReceivedTimestamp < newMessage.receivedAt!
                ) {
                    // update preview if this is the first message received or
                    // if there this is a newer message
                    updatedRoom = {
                        ...updatedRoom,
                        lastReceivedTimestamp: newMessage.receivedAt,
                        messagePreview: newMessage.content,
                    }
                    return {
                        ...state,
                        rooms: state.rooms.map((r: Room, i) =>
                            i === roomIndex ? updatedRoom : r,
                        ),
                    }
                } else {
                    // Already has latest message preview, no state change
                    return state
                }
            }
        }
        case ActionType.UPDATE_ROOM: {
            const roomIndex = state.rooms.findIndex(
                (r: Room) => r.id === action.payload.id,
            )

            if (roomIndex === -1) {
                // New rooms get added
                return {
                    ...state,
                    rooms: [...state.rooms, new Room(action.payload)],
                }
            } else if (isEqual(action.payload, state.rooms[roomIndex])) {
                // Avoid re-render, this room has not changed
                return state
            } else {
                // room needs an update...
                const updatedRoom = {
                    ...state.rooms[roomIndex],
                    ...action.payload,
                }
                return {
                    ...state,
                    rooms: state.rooms.map((r: Room, i) =>
                        i === roomIndex ? updatedRoom : r,
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

export const XMPP_DOMAIN = 'xmpp.dev.fedibtc.com'
// This is the XMPP Multi-User-Chat (MUC) domain defined
// in prosody.config.lua on the XMPP server
// https://prosody.im/doc/modules/mod_muc
export const XMPP_MUC_DOMAIN = 'xmpp-rooms.dev.fedibtc.com'
export const XMPP_SERVICE = 'wss://xmpp.dev.fedibtc.com:5281/xmpp-websocket'
export const XMPP_MOCK_PASSWORD = 'abcdefgh12345678'
export const XMPP_RESOURCE = 'community'
export const XMPP_CONNECTION_OPTIONS: Options = {
    service: XMPP_SERVICE,
    resource: XMPP_RESOURCE,
}

// Creates an ephemeral XMPP client used solely for registration
// that opens thes stream and terminates on success or failure
export const registerXmppUser = async (username: string): Promise<boolean> => {
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
                        xml('password', {}, XMPP_MOCK_PASSWORD),
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
                    // TODO: Localize this error
                    const errorMessage =
                        stanza.getChild('error')?.getChildText('text') ||
                        i18n.t('errors.unknown-error')

                    reject(errorMessage)
                }
            }
        })

        xmpp.start().catch(console.error)
    })
}

function CommunityProvider(props: React.PropsWithChildren<{}>) {
    const { state: environmentState } = useEnvironmentContext()
    const { state: federationsState, dispatch: federationsDispatch } =
        useFederationsContext()
    const { selectedFederation } = federationsState
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
        // and a username has been created for it
        if (selectedFederation === null) return
        if (!selectedFederation?.username) return

        const xmppConnectionOptions = {
            ...XMPP_CONNECTION_OPTIONS,
            username: selectedFederation.username,
            password: XMPP_MOCK_PASSWORD,
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
            if (stanza.is('message')) {
                if (
                    stanza.getAttr('type') === 'chat' ||
                    stanza.getAttr('type') === 'groupchat'
                ) {
                    const from = stanza.getAttr('from')
                    const room = from.split('@')[0]
                    const sender = from.split(`${XMPP_MUC_DOMAIN}/`)[1]
                    const bodyText = stanza.getChildText('body') as string

                    console.info(from)
                    console.info(room)
                    console.info(sender)
                    console.info(bodyText)
                    if (bodyText) {
                        // environmentState.toast?.show(body, 5000)
                        const newMessage = new Message({
                            id: stanza.attr('id'),
                            content: bodyText,
                            receivedAt: Date.now() / 1000,
                            sentIn: new Room({
                                id: room,
                            }),
                            sentBy: new Member({ username: sender }),
                        })
                        dispatch(addToMessages(newMessage))
                        dispatch(updateRoomMessagePreview(newMessage))
                    }
                }
            }
        })

        // For updating the user's online status
        xmpp.on('offline', () => {
            dispatch(changeUserIsOnline(false))
        })
        xmpp.on('online', async _address => {
            // Send a presence message
            await xmpp.send(xml('presence'))

            dispatch(changeUserIsOnline(true))
            dispatch(
                setAuthenticatedMember(
                    new Member({
                        username: selectedFederation.username,
                        jid: xmpp.jid,
                    }),
                ),
            )
        })

        xmpp.start().catch(console.error)

        dispatch(setXmppClient(xmpp))
    }, [
        federationsDispatch,
        environmentState,
        selectedFederation,
        selectedFederation?.username,
    ])

    // Update async storage when rooms are added
    useEffect(() => {
        console.log('useEffect: rooms')
        if (state.rooms.length > MOCKED_ROOMS.length) {
            console.log('storing', state.rooms.length, 'rooms')
            AsyncStorage.setItem(
                COMMUNITY_ROOMS_PERSISTENCE_KEY,
                JSON.stringify({ rooms: state.rooms }),
            )
        }
    }, [state.rooms])

    // Update async storage when messages are added
    useEffect(() => {
        console.log('useEffect: messages')
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
