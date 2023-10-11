import { TFunction } from 'i18next'

import { SupportedCurrency } from '../types'

export const makePendingBalanceText = (
    t: TFunction,
    pending: number,
    currency: SupportedCurrency,
): string => {
    if (pending > 0) {
        return t('feature.stabilitypool.deposit-pending', {
            amount: Math.abs(pending),
            currency,
        })
    } else {
        return t('feature.stabilitypool.withdrawal-pending', {
            amount: Math.abs(pending),
            currency,
        })
    }
}
