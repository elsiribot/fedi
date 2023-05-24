import type { JID } from '@xmpp/jid'
import { TFunction } from 'i18next'

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
