import { useEffect } from 'react'

import { refreshActiveStabilityPool, selectActiveFederationId } from '../redux'
import {
    StabilityPoolDepositEvent,
    StabilityPoolWithdrawalEvent,
} from '../types/bindings'
import { FedimintBridge } from '../utils/fedimint'
import { makeLog } from '../utils/log'
import { useIsStabilityPoolSupported } from './federation'
import { useCommonDispatch, useCommonSelector } from './redux'

const log = makeLog('common/hooks/stabilitypool')

/**
 * Given an instance of the bridge, monitor the stabilitypool to
 * refresh account info:
 * - every 60 seconds
 * - if a successful deposit event is received
 * - if a rejected deposit event is received
 * - if a successful withdrawal event is received
 * - if a rejected withdrawal event is received
 * TODO: Consider replacing this with a stabilityPoolAccountInfo event listener
 */
export async function useMonitorStabilityPool(fedimint: FedimintBridge) {
    const dispatch = useCommonDispatch()
    const activeFederationId = useCommonSelector(selectActiveFederationId)
    const isStabilityPoolSupported = useIsStabilityPoolSupported()

    useEffect(() => {
        // Can't monitor stabilitypool if no federation is selected
        if (!activeFederationId) return

        // Can't monitor stabilitypool if not supported
        if (!isStabilityPoolSupported) return

        log.info('Monitoring stabilitypool account info...')
        // Refresh account info every 60 seconds
        const stabilityPoolMonitor = setInterval(() => {
            dispatch(refreshActiveStabilityPool({ fedimint }))
        }, 60000)

        const unsubscribeDeposits = fedimint.addListener(
            'stabilityPoolDeposit',
            (event: StabilityPoolDepositEvent) => {
                if (event.federationId === activeFederationId) {
                    log.info('StabilityPoolDepositEvent', event.state)
                    if (event.state === 'txAccepted') {
                        dispatch(refreshActiveStabilityPool({ fedimint }))
                    } else if (
                        typeof event.state === 'object' &&
                        'txRejected' in event.state
                    ) {
                        dispatch(refreshActiveStabilityPool({ fedimint }))
                    }
                }
            },
        )
        const unsubscribeWithdrawals = fedimint.addListener(
            'stabilityPoolWithdrawal',
            (event: StabilityPoolWithdrawalEvent) => {
                if (event.federationId === activeFederationId) {
                    if (
                        event.state === 'success' ||
                        event.state === 'cancellationAccepted'
                    ) {
                        dispatch(refreshActiveStabilityPool({ fedimint }))
                    } else if (
                        typeof event.state === 'object' &&
                        'txRejected' in event.state
                    ) {
                        dispatch(refreshActiveStabilityPool({ fedimint }))
                    }
                }
            },
        )

        // Disconnect whenever dependencies change
        return () => {
            unsubscribeDeposits()
            unsubscribeWithdrawals()
            clearInterval(stabilityPoolMonitor)
        }
    }, [activeFederationId, dispatch, fedimint, isStabilityPoolSupported])
}
