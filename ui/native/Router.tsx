import notifee from '@notifee/react-native'
import { createDrawerNavigator } from '@react-navigation/drawer'
import {
    NavigationContainer,
    useNavigationContainerRef,
} from '@react-navigation/native'
import { useTheme } from '@rneui/themed'
import React, { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking } from 'react-native'

import { useToast } from '@fedi/common/hooks/toast'
import { makeLog } from '@fedi/common/utils/log'
import { parseUserInput } from '@fedi/common/utils/parser'

import { fedimint } from './bridge'
import ConnectedFederationsDrawer from './components/feature/federations/ConnectedFederationsDrawer'
import { OmniLinkHandler } from './components/feature/omni/OmniLinkHandler'
import { MainNavigator } from './screens/MainNavigator'
import SwitchingFederations from './screens/SwitchingFederations'
import { useOmniLinkContext } from './state/contexts/OmniLinkContext'
import { useMatrixPushNotifications } from './state/hooks'
import { ParserDataType } from './types'
import {
    MainNavigatorDrawerParamList,
    DRAWER_NAVIGATION_ID,
    NavigationLinkingConfig,
    deepLinksConfig,
} from './types/navigation'
import { useIsFeatureUnlocked } from './utils/hooks/security'
import { handleBackgroundEvent } from './utils/notifications'

const log = makeLog('NavigationRouter')

const Drawer = createDrawerNavigator<MainNavigatorDrawerParamList>()

const Router = () => {
    const { theme } = useTheme()
    const navigation = useNavigationContainerRef()
    const isAppUnlocked = useIsFeatureUnlocked('app')
    const { parseUrl } = useOmniLinkContext()
    const { t } = useTranslation()

    const toast = useToast()
    const routeRef = useRef<string>()

    // Makes sure to check XMPP socket health when app is foregrounded
    // useXmppHealthCheck()

    // Publishes an FCM push notification token if chat is available
    useMatrixPushNotifications()

    // Logs changes in navigation state for debugging
    const handleStateChange = useCallback(() => {
        toast.close()
        const previousRoute = routeRef.current
        const currentRoute = navigation.getCurrentRoute()

        if (previousRoute === currentRoute?.name) return

        routeRef.current = currentRoute?.name
        log.debug(
            `Navigating from "${previousRoute}" to "${routeRef.current}"`,
            {
                params: currentRoute?.params,
            },
        )
    }, [navigation, toast])

    // Grab the initial link the app was opened with, if any.
    const getInitialURL: NavigationLinkingConfig['getInitialURL'] =
        async () => {
            // Check if app was opened with deep link
            const url = await Linking.getInitialURL()
            console.error('initial url', url)
            if (url != null) {
                const link = await parseUserInput(url, fedimint, t)
                // bypass normal link handling with deep links
                switch (link.type) {
                    // navigate straight to chat rooms
                    case ParserDataType.FediChatRoom:
                        // check if you've been added to the room first
                        return `room/${link.data.id}`
                    case ParserDataType.FediChatUser:
                        return `user/${link.data.id}`
                    default:
                        // handle Omni link
                        parseUrl(url)
                        return url
                }
            }

            // Check if app was opened with notification
            const message = await notifee.getInitialNotification()
            const link = message?.notification?.data?.link
            console.error('initial link not', link)

            if (typeof link !== 'string') return ''
            const parsed = await parseUserInput(link, fedimint, t)
            console.warn('PARSED', parsed)
            // bypass normal link handling with deep links
            switch (parsed.type) {
                // navigate straight to chat rooms
                case ParserDataType.FediChatRoom:
                    // check if you've been added to the room first
                    return `room/${parsed.data.id}`
                case ParserDataType.FediChatUser:
                    return `user/${parsed.data.id}`
                default:
                    // handle Omni link
                    parseUrl(link)
                    return link
            }
            // TODO: determine if we should navigate user or parseUrl
            // just parsing for now
        }

    // Subscribe to future links that bring the app to the foreground.
    const subscribe: NavigationLinkingConfig['subscribe'] = (
        listener: (url: string) => void,
    ) => {
        const subscription = Linking.addEventListener(
            'url',
            async ({ url }) => {
                // TODO: add other deep links
                console.error('subscribe url detected', url)
                const parsed = await parseUserInput(url, fedimint, t)
                switch (parsed.type) {
                    // case ParserDataType.FediChatRoom:
                    //     listener(`${parsed.type}/${parsed.data.id}`)
                    //     break
                    default:
                        parseUrl(url)
                }
            },
        )

        // Handles updates to notification (user taps notification, actions, etc)
        notifee.onBackgroundEvent(e => handleBackgroundEvent(e))

        return () => {
            subscription.remove()
        }
    }

    const linking: NavigationLinkingConfig = {
        prefixes: [
            'fedi:',
            'lightning:',
            'bitcoin:',
            'lnurlw://',
            'lnurlp://',
            'keyauth://',
        ],
        config: deepLinksConfig,
        getInitialURL,
        subscribe,
    }

    return (
        <NavigationContainer
            ref={navigation}
            theme={theme}
            linking={linking}
            onReady={() => {
                routeRef.current = navigation.getCurrentRoute()?.name
                log.debug('Navigation is ready', {
                    route: routeRef.current,
                })
            }}
            onStateChange={handleStateChange}>
            <Drawer.Navigator
                id={DRAWER_NAVIGATION_ID}
                drawerContent={ConnectedFederationsDrawer}
                screenOptions={{ swipeEnabled: isAppUnlocked }}>
                <Drawer.Screen
                    name="MainNavigator"
                    component={MainNavigator}
                    options={{ headerShown: false }}
                />
                <Drawer.Screen
                    name="SwitchingFederations"
                    component={SwitchingFederations}
                    initialParams={{ federationId: null }}
                    options={{
                        headerShown: false,
                    }}
                />
            </Drawer.Navigator>
            <OmniLinkHandler />
        </NavigationContainer>
    )
}

export default Router
