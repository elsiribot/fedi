import { TFunction } from 'i18next'

import { selectCurrency, selectFederationBalance } from '../../redux'
import { MSats } from '../../types'
import amountUtils from '../../utils/AmountUtils'
import { useCommonSelector } from '../redux'
import { useAmountFormatter } from './useAmountFormatter'

/**
 * Returns a set of balances (sats, fiat, formatted) for a given federation.
 */
export function useBalance(t: TFunction, federationId: string) {
    const balance = useCommonSelector(s =>
        selectFederationBalance(s, federationId),
    ) as MSats
    const selectedCurrency = useCommonSelector(s =>
        selectCurrency(s, federationId),
    )
    const { makeFormattedAmountsFromMSats } = useAmountFormatter({
        currency: selectedCurrency,
        federationId,
    })

    const {
        formattedFiat,
        formattedSats,
        formattedPrimaryAmount,
        formattedSecondaryAmount,
    } = makeFormattedAmountsFromMSats(balance)

    const formattedBalance = `${formattedPrimaryAmount} (${formattedSecondaryAmount})`

    return {
        satsBalance: amountUtils.msatToSat(balance),
        formattedBalanceFiat: formattedFiat,
        formattedBalanceSats: formattedSats,
        formattedBalance,
        formattedBalanceText: `${t('words.balance')}: ${formattedBalance}`,
    }
}
