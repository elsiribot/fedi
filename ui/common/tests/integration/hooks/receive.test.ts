/**
 * Tests for onboarding flow with remote bridge
 * Testing onboarding status updates and state management
 */
import { act, waitFor } from '@testing-library/react'

import {
    useMakeLightningRequest,
    useMakeOnchainAddress,
} from '../../../hooks/receive'
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

    describe('useMakeOnchainAddress', () => {
        it('should create an onchain address with makeOnchainAddress()', async () => {
            await builder.withFederationJoined()

            const {
                store,
                remoteBridge: { fedimint },
                renderHookWithBridge,
            } = context

            const federationId = selectLastUsedFederationId(store.getState())
            const { result } = renderHookWithBridge(() =>
                useMakeOnchainAddress({
                    fedimint,
                    federationId,
                }),
            )

            // Make the onchain address
            await act(() => result.current.makeOnchainAddress())

            // Wait for the address
            await waitFor(() => {
                expect(result.current.address).toBeTruthy()
            })
        }, 30000)

        it('should save notes with onSaveNotes', async () => {
            await builder.withFederationJoined()

            const {
                store,
                remoteBridge: { fedimint },
                renderHookWithBridge,
            } = context

            const federationId = selectLastUsedFederationId(store.getState())
            const { result } = renderHookWithBridge(() =>
                useMakeOnchainAddress({ fedimint, federationId }),
            )

            // Make an onchain address
            await act(() => result.current.makeOnchainAddress())

            // Wait for the address and its respective transaction ID
            await waitFor(() => {
                expect(result.current.address).toBeDefined()
                expect(result.current.transaction).toBeDefined()
            })

            // Save notes
            await act(() => result.current.onSaveNotes('test notes'))

            // Fetch the transaction by its ID and ensure that notes match
            await waitFor(async () => {
                expect(result.current.transaction).toBeDefined()

                const transaction = await fedimint.getTransaction(
                    federationId || '',
                    result.current.transaction?.id || '',
                )

                expect(transaction.txnNotes).toBe('test notes')
            })
        }, 30000)

        it('should call the `onMakeAddressError` callback if supplied, if `makeOnchainAddress` errors', async () => {
            await builder.withFederationJoined()

            const {
                remoteBridge: { fedimint },
                renderHookWithBridge,
            } = context

            const onMakeAddressError = jest.fn()

            const { result } = renderHookWithBridge(() =>
                useMakeOnchainAddress({
                    fedimint,
                    federationId: 'invalid federation id',
                    onMakeAddressError,
                }),
            )

            // Make the onchain address
            await act(() => result.current.makeOnchainAddress())

            await waitFor(() => {
                expect(onMakeAddressError).toHaveBeenCalled()
            })
        }, 30000)

        it('should call the `onSaveNotesError` callback if supplied, if `onSaveNotes` errors', async () => {
            await builder.withFederationJoined()

            const {
                store,
                remoteBridge: { fedimint },
                renderHookWithBridge,
            } = context

            const onSaveNotesError = jest.fn()

            const federationId = selectLastUsedFederationId(store.getState())
            const { result } = renderHookWithBridge(() =>
                useMakeOnchainAddress({
                    fedimint,
                    federationId,
                    onSaveNotesError,
                }),
            )

            // Make an onchain address
            await act(() => result.current.makeOnchainAddress())

            // Wait for the address and its respective transaction ID
            await waitFor(() => {
                expect(result.current.address).toBeDefined()
                expect(result.current.transaction).toBeDefined()
            })

            // Save notes
            await act(() =>
                result.current.onSaveNotes({
                    this: 'is a test',
                } as unknown as string),
            )

            await waitFor(async () => {
                expect(onSaveNotesError).toHaveBeenCalled()
            })
        }, 30000)
    })
})
