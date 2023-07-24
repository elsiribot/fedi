import messaging from '@react-native-firebase/messaging'
import { xml } from '@xmpp/client'
import { Element } from 'ltx'
import React, {
    createContext,
    MutableRefObject,
    useCallback,
    useContext,
    useEffect,
    useRef,
} from 'react'
import { AppState as RNAppState, AppStateStatus } from 'react-native'

import {
    connectChat,
    disconnectChat,
    selectChatClientStatus,
    selectChatXmppClient,
    setWebsocketIsHealthy,
} from '@fedi/common/redux'

import { fedimint } from '../../bridge'
import { useAppDispatch, useAppSelector } from '../hooks'

export const ChatContext = createContext({})

function ChatProvider(props: React.PropsWithChildren<{}>) {
    const appStateRef = useRef<AppStateStatus>(
        RNAppState.currentState,
    ) as MutableRefObject<AppStateStatus>

    const reduxDispatch = useAppDispatch()
    const activeFederationId = useAppSelector(
        s => s.federation.activeFederationId,
    )
    const chatClientStatus = useAppSelector(selectChatClientStatus)

    const xmppClient = useAppSelector(selectChatXmppClient)

    const resumeXmppStream = useCallback(() => {
        console.info('resuming xmpp stream after coming back into foreground')
        try {
            reduxDispatch(
                setWebsocketIsHealthy({
                    federationId: activeFederationId as string,
                    healthy: false,
                }),
            )

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
                reduxDispatch(
                    setWebsocketIsHealthy({
                        federationId: activeFederationId as string,
                        healthy: true,
                    }),
                )
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
        if (
            activeFederationId &&
            chatClientStatus &&
            chatClientStatus === 'online'
        ) {
            reduxDispatch(
                setWebsocketIsHealthy({
                    federationId: activeFederationId,
                    healthy: true,
                }),
            )
        }
    }, [activeFederationId, chatClientStatus, reduxDispatch])

    return <ChatContext.Provider value={{}} {...props} />
}

function useChatContext() {
    return useContext(ChatContext)
}

export { ChatProvider, useChatContext }
