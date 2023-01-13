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

import i18n from '../../localization/i18n'
import { Member, Message, Room } from '../../types'
import { useEnvironmentContext } from './EnvironmentContext'
import { useFederationsContext } from './FederationsContext'

// Define the structure of this Context and its initial state
interface CommunityContextState {
    xmppClient: Client | null
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
    messages: [],
    rooms: [],
    membersSeen: [],
}
type AppState = typeof initialState

// Define actions that can change the state within this Context
enum ActionType {
    ADD_TO_MESSAGES = 'ADD_TO_MESSAGES',
    ADD_TO_ROOMS = 'ADD_TO_ROOMS',
    CHANGE_USER_IS_ONLINE = 'CHANGE_USER_IS_ONLINE',
    RECEIVE_MESSAGES = 'RECEIVE_MESSAGES',
    RESET_COMMUNITY_STATE = 'RESET_COMMUNITY_STATE',
    SET_XMPP_CLIENT = 'SET_XMPP_CLIENT',
    UPDATE_ROOM = 'UPDATE_ROOM',
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
        type: ActionType.ADD_TO_MESSAGES,
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
export function setXmppClient(xmpp: Client): Action {
    return {
        type: ActionType.SET_XMPP_CLIENT,
        payload: xmpp,
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
        case ActionType.ADD_TO_MESSAGES:
            console.log(state.messages)
            const messageIndex = state.messages.findIndex(
                (m: Message) => m.id === action.payload.id,
            )

            if (messageIndex === -1) {
                // New messages get added
                return {
                    ...state,
                    messages: [...state.messages, new Message(action.payload)],
                }
            } else if (isEqual(action.payload, state.messages[messageIndex])) {
                // Avoid re-render, this message is already added
                // and has not changed
                return state
            } else {
                // message is already added but has changed...
                // add conflict resolution logic here?
                return state
            }
        case ActionType.CHANGE_USER_IS_ONLINE:
            return {
                ...state,
                userIsOnline: action.payload,
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
        case ActionType.RESET_COMMUNITY_STATE:
            return { ...initialState }
        default:
            return state
    }
}

export const XMPP_DOMAIN = 'xmpp.dev.fedibtc.com'
export const XMPP_SERVICE = 'wss://xmpp.dev.fedibtc.com:5281/xmpp-websocket'
export const XMPP_MOCK_PASSWORD = 'abcdefgh12345678'
export const XMPP_CONNECTION_OPTIONS: Options = {
    service: XMPP_SERVICE,
    resource: 'community',
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
        debug(xmpp, true)

        // For debugging purposes
        xmpp.on('stanza', async stanza => {
            if (stanza.is('message')) {
                const body = stanza.getChild('body')?.getText()
                environmentState.toast?.show(body, 5000)
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
        })

        xmpp.start().catch(console.error)

        dispatch(setXmppClient(xmpp))
    }, [
        federationsDispatch,
        environmentState,
        selectedFederation,
        selectedFederation?.username,
    ])

    return <CommunityContext.Provider value={providerValue} {...props} />
}

function useCommunityContext() {
    return useContext(CommunityContext)
}

export { CommunityProvider, useCommunityContext }
