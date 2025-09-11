/**
 * Tests for onboarding flow with remote bridge
 * Testing onboarding status updates and state management
 */
import { act, waitFor } from '@testing-library/react'

import { useMakeLightningRequest } from '../../../hooks/receive'
import { selectLastUsedFederationId } from '../../../redux'
import { Sats } from '../../../types'
import { createIntegrationTestBuilder } from '../../../utils/test-utils/remote-bridge-setup'

describe('receiving payments', () => {
    const builder = createIntegrationTestBuilder()
    const context = builder.getContext()

    describe('useMakeLightningRequest', () => {
        it('should create a 1000 sat invoice and hide loader when ready', async () => {
            await builder.withFederationJoined()

            const {
                store,
                remoteBridge: { fedimint },
                renderHookWithBridge,
            } = context

            const federationId = selectLastUsedFederationId(store.getState())
            const { result } = renderHookWithBridge(() =>
                useMakeLightningRequest({
                    fedimint,
                    federationId,
                }),
            )

            // Make the lightning request
            await act(() =>
                result.current.makeLightningRequest(1000 as Sats, 'test'),
            )

            // Wait for an invoice
            await waitFor(() => {
                expect(result.current.invoice).toBeTruthy()
                expect(result.current.isInvoiceLoading).toBeFalsy()
            })
        }, 30000)

        it('should invoke an error if creating the lightning invoice fails', async () => {
            await builder.withFederationJoined()

            const {
                store,
                remoteBridge: { fedimint },
                renderHookWithBridge,
            } = context

            const federationId = selectLastUsedFederationId(store.getState())
            const { result } = renderHookWithBridge(() =>
                useMakeLightningRequest({
                    fedimint,
                    federationId,
                }),
            )

            act(() => {
                // Make the lightning request
                const invoiceResult = result.current.makeLightningRequest(
                    -1000 as Sats,
                    'test',
                )

                expect(invoiceResult).rejects.toThrow()
            })
        }, 30000)

        it('should fire the listener callback when the invoice has been paid', async () => {
            await builder.withEcashReceived(10000)

            const {
                store,
                remoteBridge: { fedimint },
                renderHookWithBridge,
            } = context

            const onInvoicePaid = jest.fn()

            const federationId = selectLastUsedFederationId(store.getState())
            const { result } = renderHookWithBridge(() =>
                useMakeLightningRequest({
                    fedimint,
                    federationId,
                    onInvoicePaid,
                }),
            )

            // Make the lightning request
            await act(() =>
                result.current.makeLightningRequest(1 as Sats, 'test'),
            )

            // Wait for an invoice
            await waitFor(() => {
                expect(result.current.invoice).toBeTruthy()
            })

            // Pay the invoice
            await fedimint.payInvoice(
                result.current.invoice || '',
                federationId || '',
            )

            await waitFor(() => {
                expect(onInvoicePaid).toHaveBeenCalled()
            })
        }, 30000)
    })
})
