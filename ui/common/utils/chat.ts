import type { JID } from '@xmpp/jid'
import { TFunction } from 'i18next'
import orderBy from 'lodash/orderBy'

import { Chat, ChatMessage, ChatType, MSats } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

export const makePaymentText = (
    t: TFunction,
    messageSentBy: string,
    messageSentTo: string,
    me: string,
    paymentRecipient: string | undefined,
    paymentAmount: MSats | undefined,
    paymentMemo: string | undefined,
): string => {
    let previewStringParams = {
        name: messageSentBy,
        amount: amountUtils.formatNumber(
            amountUtils.msatToSat(paymentAmount as MSats),
        ),
        unit: 'SATS',
        memo: paymentMemo,
    }

    if (messageSentTo === me && paymentRecipient === me) {
        return t('feature.chat.they-sent-payment', previewStringParams)
    }
    if (messageSentTo === me && paymentRecipient !== me) {
        return t('feature.chat.they-requested-payment', previewStringParams)
    }
    if (messageSentTo !== me && paymentRecipient !== me) {
        return t('feature.chat.you-sent-payment', previewStringParams)
    }
    if (messageSentTo !== me && paymentRecipient === me) {
        return t('feature.chat.you-requested-payment', previewStringParams)
    }

    return ''
}

export const jidToId = (jid: JID | string) => {
    // Remove resource, leave local + domain
    const jidString = jid.toString()
    return jidString.split('/')[0]
}

/**
 * Given a list of messages, organize the messages in a nested list of "grouped"
 * messages. The groups are organized as follows:
 * - The outer-most list is split into groups of messages sent within a similar time-frame.
 * - The middle list is messages sent back-to-back by the same user in that time frame.
 * - The inner-most lists are the list of messages by that user.
 */
export const makeMessageGroups = <
    // TODO: Replace with `ChatMessage` after full reduxification.
    T extends {
        sentAt?: number
        sentBy?: string | { username: string }
    },
>(
    messages: T[],
    sortOrder: 'desc' | 'asc',
): T[][][] => {
    const messageGroups: T[][][] = []
    let currentTimeGroup: T[][] = []
    let lastMessage: T | null = null

    const sortedMessages = orderBy(messages, 'sentAt', sortOrder)
    for (const message of sortedMessages) {
        if (
            lastMessage &&
            lastMessage.sentAt &&
            message.sentAt &&
            Math.abs(lastMessage.sentAt - message.sentAt) <= 600
        ) {
            // TODO: Consolidate to a single format for sentBy
            let isSameSender = false
            if (lastMessage.sentBy === message.sentBy) {
                console.log(`lastMessage.sentBy === message.sentBy`)
                isSameSender = true
            } else if (
                (lastMessage.sentBy as { username: string })?.username &&
                (lastMessage.sentBy as { username: string })?.username ===
                    (message.sentBy as { username: string }).username
            ) {
                isSameSender = true
            }
            console.log({ lastMessage, message, isSameSender })

            if (isSameSender) {
                // Add the message to the current group of the last sender group
                currentTimeGroup[currentTimeGroup.length - 1].push(message)
            } else {
                // Create a new sender group within the current time group
                currentTimeGroup.push([message])
            }
        } else {
            // Start a new time group with the current message
            currentTimeGroup = [[message]]
            messageGroups.push(currentTimeGroup)
        }

        lastMessage = message
    }

    return messageGroups
}

/**
 * Given a message, return its chat ID and the type of chat (direct or group).
 */
export const getChatInfoFromMessage = (message: ChatMessage, myId: string) => {
    const { sentTo, sentIn, sentBy } = message
    let id: string
    let type: ChatType

    if (sentIn) {
        type = ChatType.group
        id = sentIn
    } else if (sentTo) {
        type = ChatType.direct
        // Chat "id" is who it's with, determine based on if we or they sent
        id = sentBy === myId ? sentTo : sentBy
    } else {
        throw new Error('Message has no sentTo or sentIn')
    }

    return { id, type }
}

/**
 * Given a list of messages, return the latest in the list.
 */
export const getLatestMessage = <T extends { sentAt?: number }>(
    messages: T[],
): T | null => {
    return (
        messages.reduce(
            (prev, msg) =>
                (prev.sentAt || 0) > (msg.sentAt || 0) ? prev : msg,
            messages[0],
        ) || null
    )
}

/**
 * Given a list of messages, return a map keyed by the chat ID and with a value
 * of the latest message ID in that chat.
 */
export const getLatestMessageIdsForChats = (
    messages: ChatMessage[],
    myId: string,
) => {
    const sortedMessages = orderBy(messages, 'sentAt', 'desc')
    const lastReadMessageIds = sortedMessages.reduce((readMsgIds, msg) => {
        const chatId = getChatInfoFromMessage(msg, myId).id
        if (!readMsgIds[chatId]) {
            readMsgIds[chatId] = msg.id
        }
        return readMsgIds
    }, {} as Record<Chat['id'], string | undefined>)
    return lastReadMessageIds
}
