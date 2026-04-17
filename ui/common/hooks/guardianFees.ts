import { useCallback, useEffect, useState } from 'react'

import type { MSats } from '../types'
import type { RpcGuardianRemittanceDayBucket } from '../types/bindings'
import { useFedimint } from './fedimint'

export function useGuardianFeesDashboard(federationId?: string) {
    const fedimint = useFedimint()
    const [currentBalance, setCurrentBalance] = useState<MSats>(0 as MSats)
    const [dayBuckets, setDayBuckets] = useState<
        Array<RpcGuardianRemittanceDayBucket>
    >([])
    const [isBalanceLoading, setIsBalanceLoading] = useState(true)
    const [isWithdrawing, setIsWithdrawing] = useState(false)

    const withdrawAll = useCallback(async () => {
        if (!federationId) {
            throw new Error('Missing federation id')
        }

        if (isWithdrawing) {
            return
        }

        setIsWithdrawing(true)
        try {
            await fedimint.spv2WithdrawGuardianRemittanceAll(federationId)
        } finally {
            setIsWithdrawing(false)
        }
    }, [fedimint, federationId, isWithdrawing])

    useEffect(() => {
        setCurrentBalance(0 as MSats)
        setDayBuckets([])

        if (!federationId) {
            setIsBalanceLoading(false)
            return
        }

        setIsBalanceLoading(true)

        const unsubscribeDashboard = fedimint.spv2GuardianRemittanceDashboard({
            federationId,
            callback: nextDashboard => {
                setDayBuckets(nextDashboard.dayBuckets)
            },
        })
        const unsubscribeBalance = fedimint.spv2GuardianRemittanceBalance({
            federationId,
            callback: nextBalance => {
                setCurrentBalance(nextBalance)
                setIsBalanceLoading(false)
            },
        })

        return () => {
            unsubscribeDashboard()
            unsubscribeBalance()
        }
    }, [fedimint, federationId])

    return {
        currentBalance,
        dayBuckets,
        isBalanceLoading,
        isWithdrawing,
        withdrawAll,
    }
}
