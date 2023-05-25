import type { JID } from '@xmpp/jid'
import { TFunction } from 'i18next'
import orderBy from 'lodash/orderBy'

import { MSats } from '@fedi/common/types'
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
