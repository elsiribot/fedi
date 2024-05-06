import notifee, {
    Event,
    EventType,
    NotificationAndroid,
    NotificationIOS,
} from '@notifee/react-native'
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging'
import { TFunction } from 'i18next'

import { selectFederations } from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { makeLog } from '@fedi/common/utils/log'

import { store } from '../state/store'
import { TransactionDirection, TransactionEvent } from '../types'

const log = makeLog('Notifications')

export const handleForegroundReceived = async (
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) => {
    log.info('foreground notification received', remoteMessage)
    console.error('FOREGROUND RECEIVED', JSON.stringify(remoteMessage))
    // Create a channel (required for Android)
    const channelId = await notifee.createChannel({
        id: 'chat-new-messages',
        name: 'Chat channel',
    })
    const title = `Chat`
    const body = remoteMessage?.data?.unread
        ? `You have ${remoteMessage.data.unread} new messages`
        : `You have new messages`

    await notifee.displayNotification({
        title,
        body,
        android: {
            channelId,
            pressAction: {
                id: 'chat-new-messages',
                // roomId: remoteMessage?.data?.roomId ?? '',
            },
        },
    })
}

export const handleBackgroundReceived = async (
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) => {
    console.error(
        'BACKGROUND RECEIVED',
        typeof remoteMessage,
        remoteMessage.data,
    )
    // notifee.displayNotification(JSON.parse(remoteMessage.data.notifee))
    const title = `Chat`
    const body = remoteMessage?.data?.unread
        ? `You have ${remoteMessage.data.unread} new messages`
        : `You have new messages`

    await dispatchNotification('chat', 'Chat channel', title, body)
}
export const handleBackgroundEvent = async ({ type, detail }: Event) => {
    console.warn('background event----', type)
    if (type === EventType.ACTION_PRESS) {
        console.warn('ACTION PRESS', detail)
    } else if (type === EventType.DELIVERED) {
        console.warn('DELIVERED', detail)
        // redeem ecash?
    } else if (type === EventType.DISMISSED) {
        console.warn('DISMISSED', detail)
        // dismiss unread?
    } else if (type === EventType.PRESS) {
        console.warn('PRESS', detail)
        // deep link?
    }
}

export const displayPaymentReceivedNotification = async (
    event: TransactionEvent,
    t: TFunction,
) => {
    const { direction, amount, onchainState, oobState } = event.transaction

    // Don't show notification for outbound payment
    if (direction !== TransactionDirection.receive) return

    // Don't show notification for onchain txn until it is claimed
    if (onchainState && onchainState.type !== 'claimed') return
    // Don't show notification for ecash txn until it is done
    if (oobState && oobState.type !== 'done') return

    const federations = selectFederations(store.getState())
    const federation = federations.find(f => f.id === event.federationId)
    const federationName = federation?.name

    const amountText = amountUtils.formatNumber(amountUtils.msatToSat(amount))
    await dispatchNotification(
        'transactions',
        'Transactions Channel',
        federationName
            ? `${federationName}: ${t('phrases.payment-received')}`
            : t('phrases.payment-received'),
        `${amountText} ${t('words.sats')}`,
    )
}

export const displayMessageReceivedNotification = async (
    event: FirebaseMessagingTypes.RemoteMessage,
    t: TFunction,
) => {
    const title = `Chat`
    const body = event?.data?.unread
        ? t('feature.notifications.new-messages-count', {
              unread: event.data.unread,
          })
        : t('feature.notifications.new-messages')

    await dispatchNotification('chat', 'Chat channel', title, body, {
        groupSummary: true,
    })
}

/**
 * Shows a push notification
 *
 * @param id for Android notification channel
 * @param channelName for Android notification channel
 * @param title Bold notification title
 * @param body Long subtext for notification
 * @param actions Additional data for handling pressing the notification
 */
const dispatchNotification = async (
    id: string,
    channelName: string,
    title: string,
    body: string,
    androidParams?: NotificationAndroid,
    iosParams?: NotificationIOS,
) => {
    // Create a channel (required for Android)
    const channelId = await notifee.createChannel({
        id,
        name: channelName,
    })
    await notifee.displayNotification({
        title,
        body,
        android: {
            channelId,
            // pressAction is need if you want the notification to open the app when pressed
            pressAction: {
                id,
                ...androidParams?.pressAction,
            },
            ...androidParams,
        },
        ios: iosParams,
    })
}
