import React from 'react'
import { useTranslation } from 'react-i18next'

import { selectAuthenticatedMember } from '@fedi/common/redux'
import { ChatMessage } from '@fedi/common/types'
import { makePaymentText } from '@fedi/common/utils/chat'

import { useAppSelector } from '../../../state/hooks'
import IncomingPullPayment from './IncomingPullPayment'
import IncomingPushPayment from './IncomingPushPayment'
import OutgoingPullPayment from './OutgoingPullPayment'
import OutgoingPushPayment from './OutgoingPushPayment'

type PaymentMessageProps = {
    message: ChatMessage
}

const PaymentMessage: React.FC<PaymentMessageProps> = ({
    message,
}: PaymentMessageProps) => {
    const { t } = useTranslation()
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)
    const { sentTo, sentBy, payment } = message

    const messageSentBy = sentBy || ''
    const messageSentTo = sentTo || ''
    const paymentRecipient = payment?.recipient || ''
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
