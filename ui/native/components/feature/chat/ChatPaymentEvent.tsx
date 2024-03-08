import React from 'react'
import { useTranslation } from 'react-i18next'

import { useMatrixPaymentEvent } from '@fedi/common/hooks/matrix'
import {
    selectAuthenticatedMember,
    selectBtcExchangeRate,
    selectCurrency,
} from '@fedi/common/redux'
import { ChatMessage, MatrixPaymentEvent } from '@fedi/common/types'
import { makePaymentText } from '@fedi/common/utils/chat'

import { fedimint } from '../../../bridge'
import { useAppSelector } from '../../../state/hooks'
import IncomingPullPayment from './IncomingPullPayment'
import IncomingPushPayment from './IncomingPushPayment'
import OutgoingPullPayment from './OutgoingPullPayment'
import OutgoingPushPayment from './OutgoingPushPayment'

type Props = {
    event: MatrixPaymentEvent
}

const ChatPaymentEvent: React.FC<Props> = ({ event }: Props) => {
    const { t } = useTranslation()

    const { messageText, statusIcon, statusText, buttons } =
        useMatrixPaymentEvent({
            event,
            fedimint,
            t,
            onError: err => {},
        })

    console.debug('ChatPaymentEvent', event)
    console.debug('messageText', messageText)
    console.debug('statusIcon', statusIcon)
    console.debug('statusText', statusText)
    console.debug('buttons', buttons)

    // TODO: refactor payments
    // if (messageSentTo === me && paymentRecipient === me && message.payment) {
    //     return (
    //         <IncomingPushPayment
    //             message={message}
    //             incomingPayment={message.payment}
    //             text={paymentText}
    //         />
    //     )
    // }

    // if (messageSentTo === me && paymentRecipient !== me && message.payment) {
    //     return (
    //         <IncomingPullPayment
    //             message={message}
    //             outgoingPayment={message.payment}
    //             text={paymentText}
    //         />
    //     )
    // }

    // if (messageSentTo !== me && paymentRecipient !== me) {
    //     return <OutgoingPushPayment message={message} text={paymentText} />
    // }

    // if (messageSentTo !== me && paymentRecipient === me && message.payment) {
    //     return (
    //         <OutgoingPullPayment
    //             message={message}
    //             incomingPayment={message.payment}
    //             text={paymentText}
    //         />
    //     )
    // }

    return null
}

export default ChatPaymentEvent
