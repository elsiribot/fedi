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
    selectEcashFeeSchedule,
    selectShowFiatTxnAmounts,
} from '../redux'
import {
    fetchTransactions as reduxFetchTransactions,
    selectTransactionHistory,
    selectStabilityTransactionHistory,
} from '../redux/transactions'
import { MSats, Sats, Transaction } from '../types'
import amountUtils from '../utils/AmountUtils'
import {
    makeBase64CSVUri,
    makeCSVFilename,
    makeTransactionHistoryCSV,
} from '../utils/csv'
import { FedimintBridge } from '../utils/fedimint'
import { AmountLabelFormat, useBtcFiatPrice } from './amount'
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

export type FeeItem = {
    label: string
    formattedAmount: string
}

// Ecash fees are ppm values specified in the federations feeSchedule so we calculate
// the fee from the amount and provide all formatted UI display content
export function useEcashFeeDisplayUtils(t: TFunction) {
    const { convertSatsToFormattedFiat } = useBtcFiatPrice()
    const showFiatTxnAmounts = useCommonSelector(selectShowFiatTxnAmounts)
    const ecashFeeSchedule = useCommonSelector(selectEcashFeeSchedule)

    const makeEcashFeeItems = (amount: MSats) => {
        let ecashSendFediFeeMsats: MSats = 0 as MSats
        let federationFee = 0
        // Fedi fee for sending ecash is calculated from the federation fee schedule
        if (ecashFeeSchedule) {
            ecashSendFediFeeMsats = (amount *
                (ecashFeeSchedule.sendPpm / 1000000)) as MSats
            // Federation fee is hard-coded to 0 sats for now
            // TODO: fetch this from bridge
            federationFee = 0
        }

        // Format fedi fee
        const ecashSendFediFeeSats: Sats = amountUtils.msatToSat(
            ecashSendFediFeeMsats,
        )
        const formattedFediFeeSats = `${amountUtils.formatSats(
            ecashSendFediFeeSats,
        )} ${t('words.sats').toUpperCase()}`
        const formattedFediFeeFiat = convertSatsToFormattedFiat(
            ecashSendFediFeeSats,
            AmountLabelFormat.currencyCode,
        )
        const formattedFediFee = showFiatTxnAmounts
            ? `${formattedFediFeeFiat} (${formattedFediFeeSats})`
            : `${formattedFediFeeSats} (${formattedFediFeeFiat})`

        // Format federation fee
        const formattedFederationFeeSats = `${amountUtils.formatSats(
            federationFee as Sats,
        )} ${t('words.sats').toUpperCase()}`
        const formattedFederationFeeFiat = convertSatsToFormattedFiat(
            federationFee as Sats,
            AmountLabelFormat.currencyCode,
        )
        const formattedFederationFee = showFiatTxnAmounts
            ? `${formattedFederationFeeFiat} (${formattedFederationFeeSats})`
            : `${formattedFederationFeeSats} (${formattedFederationFeeFiat})`

        const ecashFeeItems: FeeItem[] = [
            {
                label: t('phrases.fedi-fee'),
                formattedAmount: formattedFediFee,
            },
            {
                label: t('phrases.federation-fee'),
                formattedAmount: formattedFederationFee,
            },
        ]
        return ecashFeeItems
    }

    const ecashFeesTitle = t('phrases.ecash-fees')
    const ecashFeesGuidanceText = t('feature.fees.guidance-ecash')

    return {
        ecashFeesTitle,
        ecashFeesGuidanceText,
        makeEcashFeeItems,
    }
}
