import notifee from '@notifee/react-native'
import { TFunction } from 'i18next'
import { Linking } from 'react-native'

import { ParserDataType } from '@fedi/common/types'
import { parseUserInput } from '@fedi/common/utils/parser'

import { fedimint } from '../bridge'
import { NavigationLinkingConfig } from '../types/navigation'
import { handleBackgroundEvent } from './notifications'

/**
 * Parses a fedi uri and returns a properly-formed
 * deep link or null
 * @returns
 */
const parseLink = async (url: string, t: TFunction): Promise<string | null> => {
    const parsed = await parseUserInput(url, fedimint, t)
    switch (parsed.type) {
        // navigate straight to chat rooms
        case ParserDataType.FediChatRoom:
        case ParserDataType.FediChatUser:
            // check if you've been added to the room first
            return `${parsed.type}/${parsed.data.id}`
        default:
            return null
    }
}

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
                ConfirmSendLightning: 'confirm-send-lightning',
                ConfirmSendOnChain: 'confirm-send-on-chain',
                SendSuccess: 'send-success',
                SendOfflineAmount: 'send-offline-amount',
                SendOfflineQr: 'send-offline-qr',
                // Wallet (Receive)
                Receive: 'receive',
                BitcoinRequest: 'bitcoin-request',
                ReceiveSuccess: 'receive-success',
                // Federations
                FederationInvite: 'federation-invite',
                JoinFederation: 'join-federation',
                // Backup & Recovery
                ChooseBackupMethod: 'choose-backup-method',
                ChooseRecoveryMethod: 'choose-recovery-method',
                // Social Backup
                RecordBackupVideo: 'record-backup-video',
                StartSocialBackup: 'start-social-backup',
                SocialBackupProcessing: 'social-backup-processing',
                SocialBackupCloudUpload: 'social-backup-cloud-upload',
                CompleteSocialBackup: 'complete-social-backup',
                SocialBackupSuccess: 'social-backup-success',
                // Social Recovery
                LocateSocialRecovery: 'locate-social-recovery',
                SelectRecoveryFileSuccess: 'select-recovery-file-success',
                SelectRecoveryFileFailure: 'select-recovery-file-failure',
                CompleteSocialRecovery: 'complete-social-recovery',
                SocialRecoveryFailure: 'social-recovery-failure',
                SocialRecoverySuccess: 'social-recovery-success',
                ScanSocialRecoveryCode: 'scan-social-recovery-code',
                CompleteRecoveryAssist: 'recovery-assist-confirmation',
                RecoveryAssistSuccess: 'recovery-assist-success',
                // Personal Backup
                StartPersonalBackup: 'start-personal-backup',
                RecoveryWords: 'recovery-words',
                // Personal Recovery
                PersonalRecovery: 'personal-recovery',
                PersonalRecoverySuccess: 'personal-recovery-success',
                // Modals
                Transactions: 'transactions',
                SocialRecoveryQrModal: 'social-recovery-qr-modal',
                // No federation
                Splash: 'splash',
                // Chat
                ChatRoomConversation: 'room/:roomId',
                ChatUserConversation: 'user/:userId',
            },
        },
    },
}

export const getLinkingConfig = (
    t: TFunction,
    parseUrl: (url: string) => void,
): NavigationLinkingConfig => ({
    prefixes: [
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
        console.error('initial url', url)
        if (url != null) {
            const link = parseLink(url, t)
            if (link) return link
            // Fallback - handle with omni Confirmation
            parseUrl(url)
        }

        // Check if app was opened with notification
        const message = await notifee.getInitialNotification()
        const link = message?.notification?.data?.link

        if (typeof link !== 'string') return ''
        const parsed = await parseUserInput(link, fedimint, t)
        // bypass normal link handling with deep links
        switch (parsed.type) {
            // navigate straight to chat rooms
            case ParserDataType.FediChatRoom:
            case ParserDataType.FediChatUser:
                // check if you've been added to the room first
                return `${parsed.type}/${parsed.data.id}`
            default:
                // handle Omni link
                parseUrl(link)
                return link
        }
        // TODO: determine if we should navigate user or parseUrl
        // just parsing for now
    },
    // Subscribe to future links that bring the app to the foreground.
    subscribe: listener => {
        const subscription = Linking.addEventListener(
            'url',
            async ({ url }) => {
                // TODO: add other deep links
                console.error('subscribe url detected', url)
                const link = await parseLink(url, t)
                if (link) listener(link)
                else parseUrl(url)
            },
        )

        // Handles updates to notification (user taps notification, actions, etc)
        notifee.onBackgroundEvent(e => handleBackgroundEvent(e))

        return () => {
            subscription.remove()
        }
    },
})
