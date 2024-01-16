import { TFunction } from 'i18next'
import { useCallback } from 'react'

import {
    makeTxnAmountText as makeTxnAmountTextUtil,
    makeTxnDetailItems as makeTxnDetailItemsUtil,
    makeTxnNotesText as makeTxnNotesTextUtil,
    makeStabilityTxnAmountText as makeStabilityTxnAmountTextUtil,
} from '@fedi/common/utils/wallet'

import {
    selectActiveFederationId,
    selectBtcExchangeRate,
    selectBtcUsdExchangeRate,
    selectCurrency,
    selectShowFiatTxnAmounts,
} from '../redux'
import {
    fetchTransactions as reduxFetchTransactions,
    selectTransactionHistory,
} from '../redux/transactions'
import { StabilityPoolTxn, Transaction } from '../types'
import { FedimintBridge } from '../utils/fedimint'
import { useCommonDispatch, useCommonSelector } from './redux'

export function useTransactionHistory(fedimint: FedimintBridge) {
    const dispatch = useCommonDispatch()
    const activeFederationId = useCommonSelector(selectActiveFederationId)
    const transactions = useCommonSelector(selectTransactionHistory)

    const fetchTransactions = useCallback(
        async (
            args?: Pick<
                Parameters<typeof reduxFetchTransactions>[0],
                'limit' | 'more' | 'refresh'
            >,
        ) => {
            if (!activeFederationId) throw new Error('errors.unknown-error')
            return dispatch(
                reduxFetchTransactions({
                    federationId: activeFederationId,
                    fedimint,
                    ...args,
                }),
            ).unwrap()
        },
        [activeFederationId, dispatch, fedimint],
    )

    return {
        transactions,
        fetchTransactions,
    }
}

export function useTxnDisplayUtils(t: TFunction) {
    const selectedCurrency = useCommonSelector(selectCurrency)
    const btcUsdExchangeRate = useCommonSelector(selectBtcUsdExchangeRate)
    const btcExchangeRate = useCommonSelector(selectBtcExchangeRate)
    const showFiatTxnAmounts = useCommonSelector(selectShowFiatTxnAmounts)
    const currencyText = showFiatTxnAmounts
        ? selectedCurrency
        : t('words.sats').toUpperCase()

    const makeTxnDetailAmountText = useCallback(
        (txn: Transaction) => {
            return `${makeTxnAmountTextUtil(
                t,
                txn,
                selectedCurrency,
                btcUsdExchangeRate,
                btcExchangeRate,
                showFiatTxnAmounts,
            )} ${currencyText}`
        },
        [
            btcExchangeRate,
            btcUsdExchangeRate,
            currencyText,
            selectedCurrency,
            showFiatTxnAmounts,
            t,
        ],
    )

    const makeTxnDetailItems = useCallback(
        (txn: Transaction) => {
            return makeTxnDetailItemsUtil(
                t,
                txn,
                selectedCurrency,
                btcUsdExchangeRate,
                btcExchangeRate,
                showFiatTxnAmounts,
            )
        },
        [
            btcExchangeRate,
            btcUsdExchangeRate,
            selectedCurrency,
            showFiatTxnAmounts,
            t,
        ],
    )

    const makeTxnAmountText = useCallback(
        (txn: Transaction) => {
            return makeTxnAmountTextUtil(
                t,
                txn,
                selectedCurrency,
                btcUsdExchangeRate,
                btcExchangeRate,
                showFiatTxnAmounts,
            )
        },
        [
            btcExchangeRate,
            btcUsdExchangeRate,
            selectedCurrency,
            showFiatTxnAmounts,
            t,
        ],
    )

    const makeTxnNotesText = useCallback(
        (txn: Transaction) => {
            return makeTxnNotesTextUtil(t, txn, selectedCurrency)
        },
        [selectedCurrency, t],
    )

    const makeStabilityTxnAmountText = useCallback(
        (txn: StabilityPoolTxn) => {
            return makeStabilityTxnAmountTextUtil(t, txn, selectedCurrency)
        },
        [selectedCurrency, t],
    )

    const makeStabilityTxnDetailAmountText = useCallback(
        (txn: StabilityPoolTxn) => {
            return `${makeStabilityTxnAmountTextUtil(
                t,
                txn,
                selectedCurrency,
            )} ${selectedCurrency}`
        },
        [selectedCurrency, t],
    )

    return {
        currencyText,
        makeTxnDetailAmountText,
        makeTxnDetailItems,
        makeTxnAmountText,
        makeTxnNotesText,
        makeStabilityTxnAmountText,
        makeStabilityTxnDetailAmountText,
    }
}
