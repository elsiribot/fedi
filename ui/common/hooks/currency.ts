import { useCallback } from 'react'

import { refreshHistoricalCurrencyRates } from '../redux'
import { FedimintBridge } from '../utils/fedimint'
import { makeLog } from '../utils/log'
import { useCommonDispatch } from './redux'

const log = makeLog('common/hooks/currency')

/**
 * Hook to refresh historical currency rates and update the cached fiat FX info.
 * Ensures consistent error handling and can be used across mobile & PWA.
 */
export function useSyncCurrencyRatesAndCache(fedimint: FedimintBridge) {
    const dispatch = useCommonDispatch()

    const syncCurrencyRatesAndCache = useCallback(async () => {
        try {
            await dispatch(
                refreshHistoricalCurrencyRates({ fedimint }),
            ).unwrap()
            log.info('Successfully refreshed historical currency rates.')
        } catch (err) {
            log.error('Failed to sync currency rates and update cache:', err)
        }
    }, [dispatch, fedimint])

    return syncCurrencyRatesAndCache
}
