import messaging from '@react-native-firebase/messaging'
import React, {
    createContext,
    MutableRefObject,
    useContext,
    useEffect,
    useRef,
} from 'react'
import { AppState as RNAppState, AppStateStatus } from 'react-native'

import {
    ensureHealthyXmppStream,
    selectChatClientStatus,
    selectChatXmppClient,
} from '@fedi/common/redux'

import { fedimint } from '../../bridge'
import { useAppDispatch, useAppSelector } from '../hooks'

export const ChatContext = createContext({})

function ChatProvider(props: React.PropsWithChildren<{}>) {
    const appStateRef = useRef<AppStateStatus>(
        RNAppState.currentState,
    ) as MutableRefObject<AppStateStatus>

    const dispatch = useAppDispatch()
    const activeFederationId = useAppSelector(
        s => s.federation.activeFederationId,
    )
    const chatClientStatus = useAppSelector(selectChatClientStatus)

    const xmppClient = useAppSelector(selectChatXmppClient)

    // This logic is needed to help gracefully resume the XMPP websocket stream
    useEffect(() => {
        if (!xmppClient) return

        // Subscribe to changes in AppState to detect when app goes from
        // background to foreground
        const subscription = RNAppState.addEventListener(
            'change',
            nextAppState => {
                if (
                    appStateRef.current.match(/inactive|background/) &&
                    nextAppState === 'active'
                ) {
                    dispatch(
                        ensureHealthyXmppStream({
                            fedimint,
                            federationId: activeFederationId as string,
                        }),
                    )
                }
                appStateRef.current = nextAppState
            },
        )
        return () => subscription.remove()
    }, [activeFederationId, dispatch, xmppClient])

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

    return <ChatContext.Provider value={{}} {...props} />
}

function useChatContext() {
    return useContext(ChatContext)
}

export { ChatProvider, useChatContext }
