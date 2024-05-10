import notifee, { EventType } from '@notifee/react-native'
import { Linking } from 'react-native'

import { makeLog } from '@fedi/common/utils/log'
import {
    isValidMatrixUserId,
    isValidMatrixRoomId,
} from '@fedi/common/utils/matrix'

import { NavigationLinkingConfig } from '../types/navigation'
import { handleBackgroundEvent } from './notifications'

const log = makeLog('utils/linking')

const parseDeepLink = (uri: string): string | null => {
    // Chat room
    if (!uri.startsWith('fedi://') && !uri.startsWith('fedi://')) return null

    // get the index of the first `:` after `fedi://`
    const deliminator = uri.indexOf(':', 6)
    const prefix = uri.slice(0, deliminator)
    const suffix = uri.slice(deliminator + 1)
    if (!isValidMatrixRoomId(suffix) && !isValidMatrixUserId(suffix))
        return null

    // return `${prefix}/${suffix}`
    // ex. room/!gdSfNfeIf...fedibtc.com
    return `${prefix}/${suffix}`
}

/**
 * If navigation is warranted, it return a properly-formed deep link.
 *
 * Otherwise, it returns "" and calls fallback
 */
const parseLink = (uri: string, fallback: (uri: string) => void): string => {
    // First, try to handle as deep link
    const deepLink = parseDeepLink(uri)
    if (deepLink) return deepLink

    // If it's not a deep link, don't navigate the user
    // and parse with the fallbackHandler (ie. the Omni Parser)
    fallback(uri)
    return ''
}

/** Maps valid deep links */
const deepLinksConfig: NavigationLinkingConfig['config'] = {
    screens: {
        MainNavigator: {
            initialRouteName: 'TabsNavigator',
            screens: {
                TabsNavigator: {
                    screens: {
                        Home: 'home',
                        Chat: 'chat',
                        OmniScanner: 'scan',
                    },
                },
                // Wallet (Send)
                Send: 'send',
                // Modals
                Transactions: 'transactions',
                // Chat
                ChatRoomConversation: {
                    path: 'room/:roomId',
                },
                ChatUserConversation: 'user/:userId',
            },
        },
    },
}

export const getLinkingConfig = (
    fallback: (url: string) => void,
): NavigationLinkingConfig => {
    return {
        prefixes: [
            'fedi://', // treat as deep link
            'fedi:',
            'lightning:',
            'bitcoin:',
            'lnurlw://',
            'lnurlp://',
            'keyauth://',
        ],
        config: deepLinksConfig,
        getInitialURL: async () => {
            // Check if app was opened with deep link
            const url = await Linking.getInitialURL()
            // If navigation is warranted, it return a link.
            // Otherwise, it returns "" and calls fallback
            if (url != null) return parseLink(url, fallback)

            // Check if app was opened with notification
            const message = await notifee.getInitialNotification()
            // Notifications should have a `link` property
            const link = message?.notification?.data?.link
            // If not, we no-op
            if (typeof link !== 'string') return ''

            // If navigation is warranted, it return a link.
            // Otherwise, it returns "" and calls fallback
            return parseLink(link, fallback)
        },

        // Subscribe to future links that bring the app to the foreground.
        subscribe: listener => {
            const subscription = Linking.addEventListener(
                'url',
                async ({ url }) => {
                    log.info('URL received', url)
                    // TODO: add other deep links
                    // If navigation is warranted, it return a link.
                    // Otherwise, it returns "" and calls fallback
                    const link = parseLink(url, fallback)
                    if (link !== '') listener(link)
                },
            )

            // Handles updates to notification (user taps notification, actions, etc)
            // TODO: when we add quick actions, incorporate deep linking here
            notifee.onBackgroundEvent(e => handleBackgroundEvent(e))

            const unsubscribe = notifee.onForegroundEvent(e => {
                if (e.type !== EventType.PRESS) return

                // Notifications should have a string `link` property
                const uri = e.detail?.notification?.data?.link
                // If not, we no-op
                if (typeof uri !== 'string') {
                    log.warn(
                        'Notification pressed, but "link" is not present (no-op):',
                        e.detail,
                    )
                    return
                }

                const link = parseLink(uri, fallback)
                if (link !== '') return listener(link)
                log.warn('Notification link could not be parsed (no-op)', link)
            })

            return () => {
                subscription.remove()
                unsubscribe()
            }
        },
    }
}
