import { TFunction } from 'i18next'

import {
    StabilityPoolTxn,
    SupportedCurrency,
    Transaction,
    TransactionDirection,
    UsdCents,
} from '../types'
import amountUtils from './AmountUtils'
import dateUtils from './DateUtils'

export interface DetailItem {
    label: string
    value: string
    truncated?: boolean
    copyable?: boolean
    copiedMessage?: string
}

export const makePendingBalanceText = (
    t: TFunction,
    pendingBalance: number,
    formattedAmount: string,
): string => {
    if (pendingBalance > 0) {
        return t('feature.stabilitypool.deposit-pending', {
            amount: formattedAmount,
        })
    } else {
        return t('feature.stabilitypool.withdrawal-pending', {
            amount: formattedAmount,
        })
    }
}

export const makeTxnDetailStatusText = (
    t: TFunction,
    txn: Transaction,
): string => {
    switch (txn.direction) {
        case TransactionDirection.send:
            if (txn.lightning) {
                // TODO: confirm if this is even reachable/needed since it's
                // possible refunds or any other failed LN sends may just have
                // direction=receive instead of direction=send
                switch (txn.lnState?.type) {
                    case 'waitingForRefund':
                        return t('feature.send.refund-in-block', {
                            block: txn.lnState.block_height,
                        })
                    case 'refunded':
                        return t('words.refund')
                    case 'canceled':
                        return t('words.expired')
                    case 'failed':
                        return t('words.failed')
                    default:
                        return t('phrases.sent-bitcoin')
                }
            } else if (txn.bitcoin) {
                switch (txn.onchainState?.type) {
                    case 'succeeded':
                        return t('phrases.sent-bitcoin')
                    case 'failed':
                        return t('words.failed')
                    default:
                        return t('words.pending')
                }
            } else if (txn.stabilityPoolState) {
                switch (txn.stabilityPoolState.type) {
                    case 'pendingDeposit':
                        return t('words.pending')
                    case 'completeDeposit':
                        return t('words.complete')
                    default:
                        return t('phrases.sent-bitcoin')
                }
            } else {
                return t('phrases.sent-bitcoin')
            }
        case TransactionDirection.receive:
            if (txn.lightning) {
                if (!txn.lnState) return `${t('phrases.receive-pending')}`
                switch (txn.lnState.type) {
                    case 'waitingForRefund':
                        return t('feature.send.refund-in-block', {
                            block: txn.lnState.block_height,
                        })
                    case 'refunded':
                        return t('words.refund')
                    case 'waitingForPayment':
                        return t('words.pending')
                    case 'claimed':
                        return t('words.complete')
                    case 'canceled':
                        return t('words.expired')
                    default:
                        return txn.lnState.type || ''
                }
            } else if (txn.bitcoin) {
                switch (txn.onchainState?.type) {
                    case 'waitingForTransaction':
                        return t('words.pending')
                    case 'waitingForConfirmation':
                        return t('words.seen')
                    case 'confirmed':
                        return t('words.seen')
                    case 'claimed':
                        return t('words.complete')
                    default:
                        return t('phrases.receive-pending')
                }
            } else if (txn.stabilityPoolState) {
                switch (txn.stabilityPoolState?.type) {
                    case 'pendingWithdrawal':
                        return t('words.pending')
                    case 'completeWithdrawal':
                        return t('words.complete')
                    default:
                        return ''
                }
            } else {
                return t('words.received')
            }
        default:
            return t('words.unknown')
    }
}

export const makeTxnDetailTitleText = (
    t: TFunction,
    txn: Transaction,
): string => {
    if (txn.direction === TransactionDirection.send) {
        return t('feature.send.you-sent')
    }
    if (txn.lightning) {
        if (!txn.lnState) return `${t('phrases.receive-pending')}`
        switch (txn.lnState.type) {
            case 'waitingForPayment':
                return t('phrases.receive-pending')
            case 'claimed':
                return t('feature.receive.you-received')
            case 'canceled':
                return t('words.expired')
            default:
                return t('phrases.receive-pending')
        }
    } else if (txn.bitcoin) {
        switch (txn.onchainState?.type) {
            case 'waitingForTransaction':
                return t('phrases.bitcoin-address-created')
            case 'claimed':
                return t('feature.receive.you-received')
            default:
                return t('phrases.receive-pending')
        }
    } else if (txn.stabilityPoolState) {
        switch (txn.stabilityPoolState?.type) {
            case 'pendingWithdrawal':
                return t('phrases.receive-pending')
            case 'completeWithdrawal':
                return t('feature.receive.you-received')
            default:
                return t('phrases.receive-pending')
        }
    } else {
        return t('feature.receive.you-received')
    }
}

export const makeTxnNotesText = (
    t: TFunction,
    txn: Transaction,
    currency: SupportedCurrency | undefined = SupportedCurrency.USD,
): string => {
    // always render user-submitted notes first
    if (txn.notes) return txn.notes

    // if notes is empty, some txn types can render placeholder text here
    if (txn.stabilityPoolState) {
        if (
            txn.stabilityPoolState.type === 'pendingDeposit' ||
            txn.stabilityPoolState.type === 'completeDeposit'
        ) {
            // indicate stabilitypool deposits
            return t('feature.stabilitypool.deposit-to-balance', {
                currency,
            })
        } else if (
            txn.stabilityPoolState.type === 'pendingWithdrawal' ||
            txn.stabilityPoolState.type === 'completeWithdrawal'
        ) {
            // indicate stabilitypool withdrawals
            return t('feature.stabilitypool.withdrawal-from-balance', {
                currency,
            })
        }
    }
    // indicate bitcoin addresses that do not yet have an onchain txid
    if (
        txn.direction === TransactionDirection.receive &&
        txn.bitcoin &&
        txn.onchainState?.type === 'waitingForTransaction'
    ) {
        return t('phrases.bitcoin-address-created')
    }
    return ''
}

export const makeTxnAmountText = (
    t: TFunction,
    txn: Transaction,
    currency: SupportedCurrency | undefined = SupportedCurrency.USD,
    btcUsdExchangeRate: number,
    btcExchangeRate: number,
    showFiatTxnAmounts: boolean,
): string => {
    const { amount, direction } = txn

    let sign = direction ? (direction === 'receive' ? `+` : `-`) : ''
    let formattedAmount: string
    if (showFiatTxnAmounts) {
        const fiatAmount = amountUtils.msatToFiat(amount, btcExchangeRate)
        formattedAmount = amountUtils.formatFiat(fiatAmount, currency, {
            noSymbol: true,
        })
    } else {
        formattedAmount = amountUtils.formatNumber(
            amountUtils.msatToSat(amount),
        )
    }

    // amount may be zero for onchain pending receives or for pending stabilitypool withdrawals
    if (txn.bitcoin && txn.onchainState?.type === 'waitingForTransaction') {
        sign = `~`
        formattedAmount = ''
    }

    if (txn.stabilityPoolState && showFiatTxnAmounts) {
        if ('estimated_withdrawal_cents' in txn.stabilityPoolState) {
            const estimatedWithdrawalCents = Number(
                txn.stabilityPoolState.estimated_withdrawal_cents,
            ) as UsdCents
            const convertedAmount = amountUtils.convertCentsToOtherFiat(
                estimatedWithdrawalCents,
                btcUsdExchangeRate,
                btcExchangeRate,
            )
            formattedAmount = amountUtils.formatFiat(
                convertedAmount,
                currency,
                {
                    noSymbol: true,
                },
            )
        } else if ('initial_amount_cents' in txn.stabilityPoolState) {
            const initialAmountCents = Number(
                txn.stabilityPoolState.initial_amount_cents,
            ) as UsdCents
            const convertedAmount = amountUtils.convertCentsToOtherFiat(
                initialAmountCents,
                btcUsdExchangeRate,
                btcExchangeRate,
            )
            formattedAmount = amountUtils.formatFiat(
                convertedAmount,
                currency,
                {
                    noSymbol: true,
                },
            )
        }
    }

    return `${sign}${formattedAmount}`
}

export const makeTxnStatusText = (t: TFunction, txn: Transaction): string => {
    switch (txn.direction) {
        case TransactionDirection.send:
            if (txn.lightning) {
                // TODO: confirm if this is even reachable/needed since it's
                // possible refunds or any other failed LN sends may just have
                // direction=receive instead of direction=send
                switch (txn.lnState?.type) {
                    case 'waitingForRefund':
                        return t('phrases.refund-pending')
                    case 'refunded':
                        return t('words.refund')
                    case 'canceled':
                        return t('words.expired')
                    case 'failed':
                        return t('words.failed')
                    default:
                        return t('phrases.sent-bitcoin')
                }
            } else if (txn.bitcoin) {
                switch (txn.onchainState?.type) {
                    case 'failed':
                        return t('words.failed')
                    default:
                        return t('phrases.sent-bitcoin')
                }
            } else {
                return t('phrases.sent-bitcoin')
            }
        case TransactionDirection.receive:
            if (txn.lightning) {
                if (!txn.lnState) return `${t('phrases.receive-pending')}`
                switch (txn.lnState.type) {
                    case 'waitingForRefund':
                        return t('phrases.refund-pending')
                    case 'refunded':
                        return t('words.refund')
                    case 'waitingForPayment':
                        return t('phrases.receive-pending')
                    case 'canceled':
                        return t('words.expired')
                    case 'claimed':
                        return t('phrases.received-bitcoin')
                    default:
                        return t('phrases.receive-pending')
                }
            } else if (txn.bitcoin) {
                switch (txn.onchainState?.type) {
                    case 'waitingForTransaction':
                        return t('phrases.receive-pending')
                    case 'claimed':
                        return t('phrases.received-bitcoin')
                    default:
                        return t('phrases.receive-pending')
                }
            } else if (txn.stabilityPoolState) {
                switch (txn.stabilityPoolState.type) {
                    case 'pendingWithdrawal':
                        return t('phrases.receive-pending')
                    default:
                        return t('words.received')
                }
            } else {
                return t('words.received')
            }
        default:
            return ''
    }
}

export const makeTxnDetailItems = (
    t: TFunction,
    txn: Transaction,
    currency: SupportedCurrency | undefined = SupportedCurrency.USD,
    btcUsdExchangeRate: number,
    btcExchangeRate: number,
    showFiatTxnAmounts: boolean,
) => {
    const items: DetailItem[] = []

    // Hide BTC Equivalent item when amount is zero or SATS-first setting is on
    if (txn.amount !== 0 && showFiatTxnAmounts) {
        items.push({
            label: t('phrases.bitcoin-equivalent'),
            value: `${amountUtils.formatNumber(
                amountUtils.msatToSat(txn.amount),
            )} ${t('words.sats')}`,
        })
    }
    items.push({
        label: t('words.time'),
        value: dateUtils.formatTimestamp(txn.createdAt, 'MMM dd yyyy, h:mmaaa'),
    })

    // shows the value of ecash sent in/out of stabilitypool at today's price
    // in local currency (historical value at time of txn shows elsewhere)
    if (
        txn.stabilityPoolState &&
        txn.stabilityPoolState.type !== 'pendingWithdrawal'
    ) {
        const currentValue = `${amountUtils.msatToFiatString(
            txn.amount,
            btcExchangeRate,
        )} ${currency}`
        items.push({
            label: t('feature.stabilitypool.current-value'),
            value: currentValue,
        })
        // Show additional item for historical deposit/withdrawal value if SATS-first setting is on
        if (showFiatTxnAmounts === false) {
            if ('estimated_withdrawal_cents' in txn.stabilityPoolState) {
                const estimatedWithdrawalCents = Number(
                    txn.stabilityPoolState.estimated_withdrawal_cents,
                ) as UsdCents
                const convertedAmount = amountUtils.convertCentsToOtherFiat(
                    estimatedWithdrawalCents,
                    btcUsdExchangeRate,
                    btcExchangeRate,
                )
                items.push({
                    label: t('feature.stabilitypool.withdrawal-value'),
                    value: `${amountUtils.formatFiat(
                        convertedAmount,
                        currency,
                        {
                            noSymbol: true,
                        },
                    )} ${currency}`,
                })
            } else if ('initial_amount_cents' in txn.stabilityPoolState) {
                const initialAmountCents = Number(
                    txn.stabilityPoolState.initial_amount_cents,
                ) as UsdCents
                const convertedAmount = amountUtils.convertCentsToOtherFiat(
                    initialAmountCents,
                    btcUsdExchangeRate,
                    btcExchangeRate,
                )
                items.push({
                    label: t('feature.stabilitypool.deposit-value'),
                    value: `${amountUtils.formatFiat(
                        convertedAmount,
                        currency,
                        {
                            noSymbol: true,
                        },
                    )} ${currency}`,
                })
            }
        }
    }
    if (txn.lightning) {
        items.push({
            label: t('phrases.lightning-request'),
            value: txn.lightning.invoice,
            copiedMessage: t('phrases.copied-lightning-request'),
            copyable: true,
            truncated: true,
        })
    }
    if (txn.bitcoin) {
        items.push({
            label:
                txn.onchainState?.type === 'waitingForTransaction'
                    ? t('words.address')
                    : t('words.to'),
            value: txn.bitcoin.address,
            copiedMessage: t('phrases.copied-bitcoin-address'),
            copyable: true,
            truncated: true,
        })
    }
    if (txn.onchainState && 'txid' in txn.onchainState) {
        items.push({
            label: t('phrases.transaction-id'),
            value: txn.onchainState.txid,
            copiedMessage: t('phrases.copied-transaction-id'),
            copyable: true,
            truncated: true,
        })
    }

    const txnFee = txn.lightning?.fee
    if (typeof txnFee === 'number') {
        items.push({
            label: t('words.fee'),
            value: `${amountUtils.msatToSat(txnFee)} ${t('words.sats')}`,
        })
    }

    items.push({
        label: t('words.status'),
        value: makeTxnDetailStatusText(t, txn),
    })

    // indicate stabilitypool deposits / withdrawals
    if (txn.stabilityPoolState) {
        if (
            txn.stabilityPoolState.type === 'pendingDeposit' ||
            txn.stabilityPoolState.type === 'completeDeposit'
        ) {
            items.push({
                label: t('feature.stabilitypool.deposit-to'),
                value: t('feature.stabilitypool.currency-balance', {
                    currency,
                }),
            })
        } else if (
            txn.stabilityPoolState.type === 'pendingWithdrawal' ||
            txn.stabilityPoolState.type === 'completeWithdrawal'
        ) {
            items.push({
                label: t('feature.stabilitypool.withdrawal-from'),
                value: t('feature.stabilitypool.currency-balance', {
                    currency,
                }),
            })
        }
    }

    return items
}

export const makeStabilityTxnStatusText = (
    t: TFunction,
    txn: StabilityPoolTxn,
) => {
    return txn.direction === 'deposit'
        ? t('words.deposit')
        : t('words.withdrawal')
}

export const makeStabilityTxnStatusSubtext = (
    t: TFunction,
    txn: StabilityPoolTxn,
) => {
    return txn.status === 'complete'
        ? t('words.complete')
        : `${t('words.pending')}...`
}

export const makeStabilityTxnDetailTitleText = (
    t: TFunction,
    txn: StabilityPoolTxn,
) => {
    return txn.direction === 'deposit'
        ? t('feature.stabilitypool.you-deposited')
        : t('feature.stabilitypool.you-withdrew')
}

export const makeStabilityTxnDetailItems = (
    t: TFunction,
    txn: StabilityPoolTxn,
) => {
    const items: DetailItem[] = [
        {
            label: t('words.time'),
            value: txn.timestamp
                ? dateUtils.formatTimestamp(
                      txn.timestamp,
                      'MMM dd yyyy, h:mmaaa',
                  )
                : t('words.pending'),
        },
        {
            label: t('words.status'),
            value: txn.status,
        },
    ]
    return items
}

export const makeStabilityTxnAmountText = (
    t: TFunction,
    txn: StabilityPoolTxn,
    currency: SupportedCurrency | undefined = SupportedCurrency.USD,
): string => {
    const sign = txn.direction ? (txn.direction === 'deposit' ? `+` : `-`) : ''

    const formattedAmount = amountUtils.formatFiat(
        txn.amountCents / 100,
        currency,
        {
            noSymbol: true,
        },
    )
    return `${sign}${formattedAmount}`
}
