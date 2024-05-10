import notifee, {
    AndroidImportance,
    AndroidVisibility,
    Event,
    EventType,
    NotificationAndroid,
    NotificationIOS,
} from '@notifee/react-native'
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging'
import { TFunction } from 'i18next'
import { Linking } from 'react-native'

import { selectFederations } from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { makeLog } from '@fedi/common/utils/log'
import { encodeFediMatrixRoomUri } from '@fedi/common/utils/matrix'

import { store } from '../state/store'
import { TransactionDirection, TransactionEvent } from '../types'

const log = makeLog('Notifications')

export const NOTIFICATION_TYPES = ['chat', 'payment'] as const
export type NOTIFICATION_TYPE = (typeof NOTIFICATION_TYPES)[number]

export const handleForegroundFCMReceived = async (
    message: FirebaseMessagingTypes.RemoteMessage,
) => {
    // Ignore chat notifications if app is in foreground
    if (message?.data?.type === 'chat')
        return log.info('foreground FCM notification received (no-op)', message)

    // Any other FCM notification must be a campaign message
    if (!message.notification)
        return log.info('invalid FCM notification received (no-op)', message)

    log.info('foreground Campaign notification received', message)
    await displayAnnouncement(message)
}

// Passes FCM notification (chat) to notifee
export const handleBackgroundFCMReceived = async (
    message: FirebaseMessagingTypes.RemoteMessage,
    t: TFunction,
) => {
    log.info('background FCM notification received', message.data)
    await displayMessageReceivedNotification(message.data, t)
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
        'transaction',
        'Transactions Channel',
        federationName
            ? `${federationName}: ${t('phrases.payment-received')}`
            : t('phrases.payment-received'),
        `${amountText} ${t('words.sats')}`,
        {
            link: '',
            type: 'payment',
        },
    )
}

export const displayMessageReceivedNotification = async (
    // data: FirebaseMessagingTypes.RemoteMessage,
    // todo: get type from bridge
    data: any, // extends MatrixChatEvent,
    t: TFunction,
) => {
    if (!data.room_id) return null // throw error?

    const title = t('words.chat')
    const body = data?.unread
        ? t('feature.notifications.new-messages-count', {
              unread: data.unread,
          })
        : t('feature.notifications.new-messages')

    const link = encodeFediMatrixRoomUri(data.room_id, true)

    await dispatchNotification(
        'chat',
        'Chat channel',
        title,
        body,
        {
            type: 'chat',
            link,
            data,
        },
        {
            android: { groupSummary: true },
        },
    )
}

type NotificationData = {
    // Deep link to open application when pressed
    link: string

    // Type of notification, determines what to present to user
    type: NOTIFICATION_TYPE

    // todo: type inner data?
    data?: any
}

export const displayAnnouncement = async (
    message: FirebaseMessagingTypes.RemoteMessage,
) => {
    const id = 'announcement'
    const channelName = 'Fedi Announcements'
    const title = message?.notification?.title
    const body = message?.notification?.body
    // Create a channel (required for Android)
    const channelId = await notifee.createChannel({
        id,
        name: channelName,
    })
    const android: NotificationAndroid = {
        channelId,
        // Default open the app when pressed
        // (required for android)
        pressAction: {
            id,
            launchActivity: 'default',
        },
        ...message?.notification?.android,

        // override visibility to public
        visibility: AndroidVisibility.PUBLIC,
        importance: AndroidImportance.HIGH,
    }
    const ios = {}

    await notifee.displayNotification({
        title,
        body,
        android,
        ios,
    })

    await notifee.incrementBadgeCount()
}

/**
 * Shows a push notification
 *
 * @param id for Android notification channel
 * @param channelName for Android notification channel
 * @param title Bold notification title
 * @param body Long subtext for notification
 * @param data context for notification
 * @param params platform-specific information for notification
 */
const dispatchNotification = async (
    id: string,
    channelName: string,
    title: string,
    body: string,
    data: NotificationData,
    params: {
        android?: NotificationAndroid
        ios?: NotificationIOS
    } = {},
) => {
    // Create a channel (required for Android)
    const channelId = await notifee.createChannel({
        id,
        name: channelName,
    })
    const androidParams = {
        channelId,
        // Default open the app when pressed
        // (required for android)
        pressAction: {
            id,
            launchActivity: 'default',
            ...params.android?.pressAction,
        },
        ...params.android,
    }
    await notifee.displayNotification({
        title,
        body,
        data,
        android: androidParams,
        ios: params.ios,
    })
    await notifee.incrementBadgeCount()
}

// Handles user interaction with notifications
export const handleBackgroundEvent = async ({ type, detail }: Event) => {
    if (type === EventType.ACTION_PRESS) {
        log.info('notification event (action pressed)', detail)
        // TODO: reply? accept/reject? etc?
    } else if (type === EventType.DELIVERED) {
        log.info('notification event ', detail)
        // TODO: redeem ecash?
    } else if (type === EventType.DISMISSED) {
        log.info('notification event (dismissed)', detail)
        // TODO: dismiss unread indicator?
    } else if (type === EventType.PRESS) {
        log.info('notification event (pressed)', detail)
        // deep link? (handled elsewhere for now)
    }
}

export const getInitialUrl = async () => {
    // Check if the app was opened by a deep link
    const url = await Linking.getInitialURL()

    if (url != null) {
        return url
    }

    // Check if there is an initial notification
    // ie. app was opened by tapping a notification
    const notification = await notifee.getInitialNotification()

    // TODO: Handle press actions (quick actions)

    // Get the `url` property from the notification which corresponds to a screen
    // This property needs to be set on the notification payload when sending it
    return notification?.notification?.data?.link
}
