import { client, xml } from '@xmpp/client'
import debug from '@xmpp/debug'
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useReducer,
} from 'react'

type User = {
    name: string
}
// Define the structure of this Context and its initial state
interface CommunityContextState {
    loggedInUser: User | null
}
const initialState: CommunityContextState = {
    loggedInUser: null,
}
type AppState = typeof initialState

// Define actions that can change the state within this Context
enum ActionType {
    CHANGE_LOGGED_IN_USER = 'CHANGE_LOGGED_IN_USER',
    RESET_COMMUNITY_STATE = 'RESET_COMMUNITY_STATE',
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
export function changeLoggedInUser(user: User): Action {
    return {
        type: ActionType.CHANGE_LOGGED_IN_USER,
        payload: user,
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
        case ActionType.CHANGE_LOGGED_IN_USER:
            return {
                ...state,
                loggedInUser: action.payload,
            }
        case ActionType.RESET_COMMUNITY_STATE:
            return { ...initialState }
        default:
            return state
    }
}

function CommunityProvider(props: React.PropsWithChildren<{}>) {
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
        // const DOMAIN = 'fedi-xmpp.local'

        const xmpp = client({
            // service: 'ws://fedi-xmpp.local:5280/xmpp-websocket',

            // service: 'wss://jabber.calyxinstitute.org:5281/xmpp-websocket',
            // service: 'wss://fedi-xmpp.local:5281/xmpp-websocket',
            service: 'wss://fedi-xmpp.local:5281/xmpp-websocket',
            // domain: 'fedi-xmpp.local',
            resource: 'example-fedi',
            username: 'oz21m',
            password: 'oz21m',
        })

        console.debug('useEffect')

        debug(xmpp, true)

        xmpp.on('error', err => {
            console.error(err)
        })

        xmpp.on('offline', () => {
            console.log('offline')
        })

        xmpp.on('stanza', async stanza => {
            if (stanza.is('message')) {
                await xmpp.send(xml('presence', { type: 'unavailable' }))
                await xmpp.stop()
            }
        })

        xmpp.on('online', async address => {
            // Makes itself available
            await xmpp.send(xml('presence'))

            // Sends a chat message to itself
            const message = xml(
                'message',
                { type: 'chat', to: address },
                xml('body', {}, 'hello world'),
            )
            await xmpp.send(message)
        })

        xmpp.start().catch(console.error)
    }, [])

    return <CommunityContext.Provider value={providerValue} {...props} />
}

function useCommunityContext() {
    return useContext(CommunityContext)
}

export { CommunityProvider, useCommunityContext }
