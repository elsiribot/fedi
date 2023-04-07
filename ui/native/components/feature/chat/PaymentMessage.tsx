import React from 'react'
import { useTranslation } from 'react-i18next'

import amountUtils from '@fedi/common/utils/AmountUtils'

import { useChatContext } from '../../../state/contexts/ChatContext'
import { Message, MSats } from '../../../types'
import IncomingPaymentRequest from './IncomingPaymentRequest'
import OutgoingPaymentRequest from './OutgoingPaymentRequest'

type PaymentMessageProps = {
    message: Message
}

const PaymentMessage: React.FC<PaymentMessageProps> = ({
    message,
}: PaymentMessageProps) => {
    const { t } = useTranslation()
    const { state } = useChatContext()
    const { authenticatedMember } = state
    const { payment } = message

    const sentByMe =
        message.sentBy?.username.toLowerCase() ===
        authenticatedMember?.username.toLowerCase()

    // This is for receiver-initated payments so (counter-intuitively) if I
    // sent the OUTGOING message (payment request), then the payment
    // itself would be INCOMING and I am the RECEIVER of the payment
    if (sentByMe) {
        return (
            <OutgoingPaymentRequest
                message={message}
                incomingPayment={message.payment!}
                text={`${t('feature.chat.outgoing-chat-payment', {
                    amount: amountUtils.msatToSat(payment?.amount as MSats),
                    unit: 'SATS',
                    name: message.sentBy?.username,
                    memo: payment?.memo,
                })}`}
            />
        )
    } else {
        return (
            <IncomingPaymentRequest
                message={message}
                outgoingPayment={message.payment!}
                text={`${t('feature.chat.incoming-chat-payment', {
                    amount: amountUtils.msatToSat(payment?.amount as MSats),
                    unit: 'SATS',
                    name: message.sentBy?.username,
                    memo: payment?.memo,
                })}`}
            />
        )
    }
}

export default PaymentMessage
