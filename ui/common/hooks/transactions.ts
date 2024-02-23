import { TFunction } from 'i18next'
import { useCallback } from 'react'

import {
    makeTxnAmountText as makeTxnAmountTextUtil,
    makeTxnDetailItems as makeTxnDetailItemsUtil,
    makeTxnNotesText as makeTxnNotesTextUtil,
    makeStabilityTxnAmountText as makeStabilityTxnAmountTextUtil,
    makeStabilityTxnDetailItems as makeStabilityTxnDetailItemsUtil,
} from '@fedi/common/utils/wallet'

import {
    selectActiveFederation,
    selectActiveFederationId,
    selectBtcExchangeRate,
    selectBtcUsdExchangeRate,
    selectCurrency,
    selectShowFiatTxnAmounts,
} from '../redux'
import {
    fetchTransactions as reduxFetchTransactions,
    selectTransactionHistory,
    selectStabilityTransactionHistory,
} from '../redux/transactions'
import { Transaction } from '../types'
import {
    makeBase64CSVUri,
    makeCSVFilename,
    makeTransactionHistoryCSV,
} from '../utils/csv'
import { FedimintBridge } from '../utils/fedimint'
import { useCommonDispatch, useCommonSelector } from './redux'

export function useTransactionHistory(fedimint: FedimintBridge) {
    const dispatch = useCommonDispatch()
    const activeFederationId = useCommonSelector(selectActiveFederationId)
    const transactions = useCommonSelector(selectTransactionHistory)
    const stabilityPoolTxns = useCommonSelector(
        selectStabilityTransactionHistory,
    )

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
        stabilityPoolTxns,
        fetchTransactions,
    }
}

export function useTxnDisplayUtils(t: TFunction) {
    const selectedCurrency = useCommonSelector(selectCurrency)
    const btcUsdExchangeRate = useCommonSelector(selectBtcUsdExchangeRate)
    const btcExchangeRate = useCommonSelector(selectBtcExchangeRate)
    const showFiatTxnAmounts = useCommonSelector(selectShowFiatTxnAmounts)
    const preferredCurrency = showFiatTxnAmounts
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
            )} ${preferredCurrency}`
        },
        [
            btcExchangeRate,
            btcUsdExchangeRate,
            preferredCurrency,
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
        (txn: Transaction) => {
            return makeStabilityTxnAmountTextUtil(
                t,
                txn,
                selectedCurrency,
                btcUsdExchangeRate,
                btcExchangeRate,
                true,
            )
        },
        [btcExchangeRate, btcUsdExchangeRate, selectedCurrency, t],
    )

    const makeStabilityTxnDetailAmountText = useCallback(
        (txn: Transaction) => {
            return `${makeStabilityTxnAmountTextUtil(
                t,
                txn,
                selectedCurrency,
                btcUsdExchangeRate,
                btcExchangeRate,
                true,
            )} ${selectedCurrency}`
        },
        [btcExchangeRate, btcUsdExchangeRate, selectedCurrency, t],
    )

    const makeStabilityTxnDetailItems = useCallback(
        (txn: Transaction) => {
            return makeStabilityTxnDetailItemsUtil(
                t,
                txn,
                selectedCurrency,
                btcExchangeRate,
            )
        },
        [btcExchangeRate, selectedCurrency, t],
    )

    return {
        preferredCurrency,
        makeTxnDetailAmountText,
        makeTxnDetailItems,
        makeTxnAmountText,
        makeTxnNotesText,
        makeStabilityTxnAmountText,
        makeStabilityTxnDetailAmountText,
        makeStabilityTxnDetailItems,
    }
}

export function useExportTransactions(fedimint: FedimintBridge) {
    const { fetchTransactions } = useTransactionHistory(fedimint)
    const activeFederation = useCommonSelector(selectActiveFederation)

    const exportTransactions = useCallback(async (): Promise<
        | { success: true; uri: string; fileName: string }
        | { success: false; message: string }
    > => {
        let transactions: Array<Transaction> = []

        try {
            transactions = await fetchTransactions({
                // TODO: find a better way than a hardcoded value
                limit: 10000,
            })

            const fileName = makeCSVFilename(
                activeFederation?.name
                    ? 'transactions-' + activeFederation.name
                    : 'transactions',
            )
            const uri = makeBase64CSVUri(
                makeTransactionHistoryCSV(transactions),
            )

            return {
                success: true,
                uri,
                fileName,
            }
        } catch (e) {
            return {
                success: false,
                message: (e as Error).message,
            }
        }
    }, [])

    return exportTransactions
}
