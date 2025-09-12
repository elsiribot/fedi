import { act } from '@testing-library/react'
import i18next from 'i18next'

import { useOmniPaymentState } from '../../../hooks/pay'
import { selectLastUsedFederationId } from '../../../redux'
import {
    MSats,
    ParsedBitcoinAddress,
    ParsedBolt11,
    ParsedLnurlPay,
    Sats,
} from '../../../types'
import amountUtils from '../../../utils/AmountUtils'
import { parseUserInput } from '../../../utils/parser'
import { createIntegrationTestBuilder } from '../../../utils/test-utils/remote-bridge-setup'

describe('useOmniPaymentState', () => {
    const builder = createIntegrationTestBuilder()
    const context = builder.getContext()

    it('should parse and pay a lightning invoice', async () => {
        await builder.withEcashReceived(10000)

        const {
            store,
            remoteBridge: { fedimint },
            renderHookWithBridge,
        } = context

        const federationId = selectLastUsedFederationId(store.getState())
        const { result } = renderHookWithBridge(() =>
            useOmniPaymentState(fedimint, federationId, i18next.t),
        )

        const invoice = await fedimint.generateInvoice(
            1000 as MSats,
            'memo',
            federationId ?? '',
        )

        // Parse the invoice into ParsedData
        const parsedData = (await parseUserInput(
            invoice,
            fedimint,
            i18next.t,
            federationId,
            false,
        )) as ParsedBolt11
        const amountSats = amountUtils.msatToSat(parsedData.data.amount)

        // Handle the parsed data
        await act(() => result.current.handleOmniInput(parsedData))

        // Pay the invoice using handleOmniSend
        await act(async () => {
            const res = await result.current.handleOmniSend(amountSats)
            expect('preimage' in res && res.preimage).toBeTruthy()
        })
    })

    it('should parse and pay an onchain address', async () => {
        await builder.withEcashReceived(10000000)

        const {
            store,
            remoteBridge: { fedimint },
            renderHookWithBridge,
        } = context

        const federationId = selectLastUsedFederationId(store.getState())
        const { result } = renderHookWithBridge(() =>
            useOmniPaymentState(fedimint, federationId, i18next.t),
        )

        const address = await fedimint.generateAddress(federationId ?? '')

        // Parse the invoice into ParsedData
        const parsedData = (await parseUserInput(
            address,
            fedimint,
            i18next.t,
            federationId,
            false,
        )) as ParsedBitcoinAddress

        // Handle the parsed data
        await act(() => result.current.handleOmniInput(parsedData))

        // Pay the invoice using handleOmniSend
        await act(async () => {
            const res = await result.current.handleOmniSend(1000 as Sats)
            expect('txid' in res && res.txid).toBeTruthy()
        })
    })

    it('should parse and pay an lnurl receive code', async () => {
        await builder.withEcashReceived(10000)

        const {
            store,
            remoteBridge: { fedimint },
            renderHookWithBridge,
        } = context

        const federationId = selectLastUsedFederationId(store.getState())
        const { result } = renderHookWithBridge(() =>
            useOmniPaymentState(fedimint, federationId, i18next.t),
        )

        const lnurlReceiveCode = await fedimint.getRecurringdLnurl(
            federationId ?? '',
        )

        const parsedData = (await parseUserInput(
            lnurlReceiveCode,
            fedimint,
            i18next.t,
            federationId,
            false,
        )) as ParsedLnurlPay

        // Handle the parsed data
        await act(() => result.current.handleOmniInput(parsedData))

        // Pay the invoice using handleOmniSend
        await act(async () => {
            const res = await result.current.handleOmniSend(1 as Sats)
            expect('preimage' in res && res.preimage).toBeTruthy()
        })
    })
})
