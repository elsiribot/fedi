import { TFunction } from 'i18next'

import { Transaction, TransactionDirection } from '../types'

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
                return t('phrases.address-created')
            case 'claimed':
                return t('feature.receive.you-received')
            default:
                return t('phrases.receive-pending')
        }
    } else {
        return t('feature.receive.you-received')
    }
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
                        return t('phrases.address-created')
                    case 'claimed':
                        return t('phrases.received-bitcoin')
                    default:
                        return t('phrases.receive-pending')
                }
            } else {
                return t('words.received')
            }
        default:
            return ''
    }
}
