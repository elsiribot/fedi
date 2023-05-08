import React from 'react'
import { useTranslation } from 'react-i18next'

import { useChatContext } from '../../../state/contexts/ChatContext'
import { Message } from '../../../types'
import { makePaymentText } from '../../../utils/ChatUtils'
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
    const { sentTo, sentBy, payment } = message

    const messageSentBy = sentBy?.username || ''
    const messageSentTo = sentTo?.username || ''
    const paymentRecipient = payment?.recipient?.username || ''
    const me = authenticatedMember?.username || ''

    const paymentText = makePaymentText(
        t,
        messageSentBy,
        messageSentTo,
        me,
        paymentRecipient,
        payment?.amount,
        payment?.memo,
    )
    if (messageSentTo === me && paymentRecipient === me) {
        return (
            <IncomingPushPayment
                message={message}
                incomingPayment={message.payment!}
                text={paymentText}
            />
        )
    }
    if (messageSentTo === me && paymentRecipient !== me) {
        return (
            <IncomingPullPayment
                message={message}
                outgoingPayment={message.payment!}
                text={paymentText}
            />
        )
    }
    if (messageSentTo !== me && paymentRecipient !== me) {
        return <OutgoingPushPayment text={paymentText} />
    }
    if (messageSentTo !== me && paymentRecipient === me) {
        return (
            <OutgoingPullPayment
                message={message}
                incomingPayment={message.payment!}
                text={paymentText}
            />
        )
    }

    return null
}

export default PaymentMessage
