import { act } from '@testing-library/react'
import i18next from 'i18next'

import { createIntegrationTestBuilder } from '@fedi/common/tests/utils/remote-bridge-setup'
import { renderHookWithBridge } from '@fedi/common/tests/utils/render'

import { useBalance } from '../../../../hooks/amount'
import {
    fetchCurrencyPrices,
    selectLastUsedFederation,
} from '../../../../redux'

describe('useBalance hook', () => {
    const builder = createIntegrationTestBuilder()
    const context = builder.getContext()

    it('should return the balance for a given federation', async () => {
        await builder.withEcashReceived(10000)

        const { store, bridge } = context

        act(() => {
            store.dispatch({
                type: fetchCurrencyPrices.fulfilled.type,
                payload: {
                    btcUsdRate: 100000,
                    fiatUsdRates: {},
                },
            })
        })

        const federation = selectLastUsedFederation(store.getState())
        const { result } = renderHookWithBridge(
            () => useBalance(i18next.t, federation?.id ?? ''),
            store,
            bridge.fedimint,
        )

        expect(result.current.satsBalance).toBe(10)
        expect(result.current.formattedBalanceFiat).toBe('0.01 USD')
        expect(result.current.formattedBalanceSats).toBe('10 SATS')
        expect(result.current.formattedBalance).toBe('0.01 USD (10 SATS)')
        expect(result.current.formattedBalanceText).toBe(
            `${i18next.t('words.balance')}: 0.01 USD (10 SATS)`,
        )
    })
})
