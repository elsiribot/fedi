import { useCallback } from 'react'

import { selectActiveFederationId } from '../redux'
import {
    fetchTransactions as reduxFetchTransactions,
    selectTransactionHistory,
} from '../redux/transactions'
import { FedimintBridge } from '../utils/fedimint'
import { useCommonDispatch, useCommonSelector } from './redux'

export function useTransactionHistory(fedimint: FedimintBridge) {
    const dispatch = useCommonDispatch()
    const activeFederationId = useCommonSelector(selectActiveFederationId)
    const transactions = useCommonSelector(selectTransactionHistory)

    const fetchTransactions = useCallback(
        async (refresh?: boolean) => {
            if (!activeFederationId) throw new Error('errors.unknown-error')
            return dispatch(
                reduxFetchTransactions({
                    federationId: activeFederationId,
                    fedimint,
                    refresh,
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
