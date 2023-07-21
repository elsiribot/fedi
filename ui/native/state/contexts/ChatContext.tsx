import messaging from '@react-native-firebase/messaging'
import { xml } from '@xmpp/client'
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
    disconnectChat,
    selectAllChatMessages,
    selectAuthenticatedMember,
    selectChatClientStatus,
    selectChatLastReadMessageIds,
    selectChatLastSeenMessageId,
    selectChatXmppClient,
    selectLatestChatMessage,
    setLastReadMessageId,
    setLastSeenMessageId,
} from '@fedi/common/redux'
import {
    getChatInfoFromMessage,
    getLatestMessage,
} from '@fedi/common/utils/chat'

import { useAppDispatch, useAppSelector } from '../hooks'

// Define the structure of this Context and its initial state
interface ChatContextState {
    websocketIsHealthy: boolean
    isOnChatScreen: boolean
    activeChatId: string | null
}
const initialState: ChatContextState = {
    websocketIsHealthy: false,
    isOnChatScreen: false,
    activeChatId: null,
}

// Define actions that can change the state within this Context
enum ActionType {
    CHANGE_WEBSOCKET_IS_HEALTHY = 'CHANGE_WEBSOCKET_IS_HEALTHY',
    CHANGE_IS_ON_CHAT_SCREEN = 'CHANGE_IS_ON_CHAT_SCREEN',
    CHANGE_ACTIVE_CHAT_ID = 'CHANGE_ACTIVE_CHAT_ID',
    RESET_CHAT_STATE = 'RESET_CHAT_STATE',
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

export function changeWebsocketIsHealthy(healthy: boolean): Action {
    return {
        type: ActionType.CHANGE_WEBSOCKET_IS_HEALTHY,
        payload: healthy,
    }
}
export function changeIsOnChatScreen(isOnChatScreen: boolean): Action {
    return {
        type: ActionType.CHANGE_IS_ON_CHAT_SCREEN,
        payload: isOnChatScreen,
    }
}
export function changeActiveChatId(activeChatId: string | null): Action {
    return {
        type: ActionType.CHANGE_ACTIVE_CHAT_ID,
        payload: activeChatId,
    }
}
export function resetChatState(): Action {
    return {
        type: ActionType.RESET_CHAT_STATE,
    }
}

// Implement the reducer with actions and state changes
export function reducer(
    state: ChatContextState,
    action: Action,
): ChatContextState {
    switch (action.type) {
        case ActionType.CHANGE_WEBSOCKET_IS_HEALTHY:
            return {
                ...state,
                websocketIsHealthy: action.payload,
            }
        case ActionType.CHANGE_IS_ON_CHAT_SCREEN:
            return {
                ...state,
                isOnChatScreen: action.payload,
            }
        case ActionType.CHANGE_ACTIVE_CHAT_ID:
            return {
                ...state,
                activeChatId: action.payload,
            }
        case ActionType.RESET_CHAT_STATE:
            return { ...initialState }
        default:
            return state
    }
}

function ChatProvider(props: React.PropsWithChildren<{}>) {
    const [state, dispatch] = useReducer<
        React.Reducer<ChatContextState, Action>
    >(reducer, initialState)
    const appStateRef = useRef<AppStateStatus>(
        RNAppState.currentState,
    ) as MutableRefObject<AppStateStatus>

    const reduxDispatch = useAppDispatch()
    const activeFederationId = useAppSelector(
        s => s.federation.activeFederationId,
    )
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)
    const latestMessage = useAppSelector(selectLatestChatMessage)
    const lastReadMessageIds = useAppSelector(selectChatLastReadMessageIds)
    const lastSeenMessageId = useAppSelector(selectChatLastSeenMessageId)
    const messages = useAppSelector(selectAllChatMessages)
    const chatClientStatus = useAppSelector(selectChatClientStatus)

    const xmppClient = useAppSelector(selectChatXmppClient)

    const resumeXmppStream = useCallback(() => {
        console.info('resuming xmpp stream after coming back into foreground')
        try {
            dispatch(changeWebsocketIsHealthy(false))

            // Sometimes we send a presence message and do not
            // get a response which may mean the stream cannot
            // be resumed so we need to stop and rebuild the client
            let reconnectTimer = setTimeout(async () => {
                console.info(
                    'no response from XMPP server after 3s, rebuilding XMPP client',
                )
                await reduxDispatch(
                    disconnectChat({
                        federationId: activeFederationId as string,
                    }),
                ).unwrap()
                reduxDispatch(
                    connectChat({
                        fedimint,
                        federationId: activeFederationId as string,
                    }),
                )
            }, 3000)
            // This expects a response to the presence message which means
            // the stream has been resumed successfully so we can clear
            // the reconnectTimer and cleanup the listener
            const onStanzaReceived = async (_: Element) => {
                dispatch(changeWebsocketIsHealthy(true))
                xmppClient?.xmpp.removeListener('stanza', onStanzaReceived)
                console.info(
                    'XMPP server responded, do not rebuild XMPP client',
                )
                clearTimeout(reconnectTimer)
            }
            xmppClient?.xmpp.on('stanza', onStanzaReceived)
            console.info(
                'sending presence to XMPP server to test for stable stream',
            )
            xmppClient?.xmpp.send(xml('presence'))
        } catch (error) {
            console.error('Failed to resume XMPP stream')
        }
    }, [activeFederationId, reduxDispatch, xmppClient?.xmpp])

    // This logic is needed to help gracefully resume the XMPP websocket stream
    useEffect(() => {
        if (xmppClient === null) return

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
    }, [xmppClient, resumeXmppStream])

    // This effect publishes the device's FCM token to the XMPP server
    // so it can receive push notifications
    useEffect(() => {
        if (xmppClient && chatClientStatus && chatClientStatus === 'online') {
            messaging()
                .getToken()
                .then(token => {
                    xmppClient.publishNotificationToken(token)
                })
        }
    }, [chatClientStatus, xmppClient])

    useEffect(() => {
        if (chatClientStatus && chatClientStatus === 'online') {
            dispatch(changeWebsocketIsHealthy(true))
        }
    }, [chatClientStatus])

    // While on chat screen, update last seen when it doesn't match
    const { isOnChatScreen } = state
    useEffect(() => {
        if (!isOnChatScreen || !activeFederationId || !messages.length) return
        if (!latestMessage?.id || latestMessage.id === lastSeenMessageId) return
        reduxDispatch(
            setLastSeenMessageId({
                federationId: activeFederationId,
                messageId: latestMessage.id,
            }),
        )
    }, [
        activeFederationId,
        isOnChatScreen,
        lastSeenMessageId,
        latestMessage,
        messages.length,
        reduxDispatch,
    ])

    // While actively in a chat, update last read when it doesn't match
    useEffect(() => {
        if (!activeFederationId || !messages.length) return

        const chatId = state.activeChatId
        if (!chatId) return

        const myId = authenticatedMember?.id
        if (!myId) return

        const activeChatMessages = messages.filter(
            m => getChatInfoFromMessage(m, myId)?.id === chatId,
        )
        const latestMessageInActiveChat = getLatestMessage(activeChatMessages)
        if (
            !latestMessageInActiveChat?.id ||
            lastReadMessageIds[chatId] === latestMessageInActiveChat.id
        )
            return

        reduxDispatch(
            setLastReadMessageId({
                federationId: activeFederationId,
                messageId: latestMessageInActiveChat.id,
                chatId,
            }),
        )
    }, [
        activeFederationId,
        authenticatedMember?.id,
        lastReadMessageIds,
        messages,
        reduxDispatch,
        state.activeChatId,
    ])

    // useMemo makes sure the Provider only re-renders when
    // there is a state change. Some state from redux is also added in.
    const providerValue = useMemo(
        () => ({
            state,
            dispatch,
        }),
        [state, dispatch],
    )

    return <ChatContext.Provider value={providerValue} {...props} />
}

function useChatContext() {
    return useContext(ChatContext)
}

export { ChatProvider, useChatContext }
