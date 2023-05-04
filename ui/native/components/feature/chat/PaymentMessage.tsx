import React from 'react'
import { useTranslation } from 'react-i18next'

import amountUtils from '@fedi/common/utils/AmountUtils'

import { useChatContext } from '../../../state/contexts/ChatContext'
import { Message, MSats } from '../../../types'
import IncomingPullPayment from './IncomingPullPayment'
import IncomingPushPayment from './IncomingPushPayment'
import OutgoingPullPayment from './OutgoingPullPayment'
import OutgoingPushPayment from './OutgoingPushPayment'

type PaymentMessageProps = {
    message: Message
}

const PaymentMessage: React.FC<PaymentMessageProps> = ({
    message,
}: PaymentMessageProps) => {
    const { t } = useTranslation()
    const {
        state: { authenticatedMember },
    } = useChatContext()
    const { payment } = message

    const messageRecipient = message.sentTo?.username.toLowerCase()
    const paymentRecipient = message.payment?.recipient?.username.toLowerCase()
    const me = authenticatedMember?.username.toLowerCase()

    if (messageRecipient === me && paymentRecipient === me) {
        return (
            <IncomingPushPayment
                message={message}
                incomingPayment={message.payment!}
                text={`${t('feature.chat.incoming-push-payment', {
                    amount: amountUtils.msatToSat(payment?.amount as MSats),
                    unit: 'SATS',
                    name: message.sentBy?.username,
                    memo: payment?.memo,
                })}`}
            />
        )
    }
    if (messageRecipient === me && paymentRecipient !== me) {
        return (
            <IncomingPullPayment
                message={message}
                outgoingPayment={message.payment!}
                text={`${t('feature.chat.incoming-pull-payment', {
                    amount: amountUtils.msatToSat(payment?.amount as MSats),
                    unit: 'SATS',
                    name: message.sentBy?.username,
                    memo: payment?.memo,
                })}`}
            />
        )
    }
    if (messageRecipient !== me && paymentRecipient !== me) {
        return (
            <OutgoingPushPayment
                text={`${t('feature.chat.outgoing-push-payment', {
                    amount: amountUtils.msatToSat(payment?.amount as MSats),
                    unit: 'SATS',
                    memo: payment?.memo,
                })}`}
            />
        )
    }
    if (messageRecipient !== me && paymentRecipient === me) {
        return (
            <OutgoingPullPayment
                message={message}
                incomingPayment={message.payment!}
                text={`${t('feature.chat.outgoing-pull-payment', {
                    amount: amountUtils.msatToSat(payment?.amount as MSats),
                    unit: 'SATS',
                    memo: payment?.memo,
                })}`}
            />
        )
    }

    return null
}

export default PaymentMessage
