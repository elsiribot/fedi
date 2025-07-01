import { renderHook, waitFor } from '@testing-library/react'

import { MSats } from '@fedi/common/types'

// Import the hook after setting up all mocks
import { useMatrixPaymentTransaction } from '../../hooks/matrix'
import { RpcLnReceiveState } from '../../types/bindings'
import { createMockPaymentEvent } from '../mock-data/matrix-event'
import { mockFedimint, mockSelectorValues } from '../setup/jest.setup'

/*
// Payment Transaction Hook Tests
// Business Context: When users view their payment history or click on payment messages,
// they need to see detailed transaction information including amounts, fees, timestamps,
// and confirmation status. The hook manages state for fetching this data from the bridge
*/
describe('useMatrixPaymentTransaction', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        // Reset the fedimint bridge mock to ensure clean state
        mockFedimint.getTransaction.mockClear()
    })

    it('should return no-op state for legacy payments (missing senderOperationId)', async () => {
        mockSelectorValues({
            selectMatrixAuth: { userId: 'npub123' },
        })
        mockFedimint.getTransaction.mockResolvedValue(undefined as any)

        const event = createMockPaymentEvent({
            senderId: 'npub123',
            senderOperationId: undefined,
        })

        const { result } = renderHook(() =>
            useMatrixPaymentTransaction({
                event,
                fedimint: mockFedimint,
            }),
        )

        expect(result.current.hasTriedFetch).toBe(true)
        expect(result.current.transaction).toBeNull()
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeNull()
    })

    it('should return the txn resolved by getTransaction', async () => {
        const mockTransaction = {
            id: 'tx123',
            amount: 1000000 as MSats,
            fediFeeStatus: null,
            txnNotes: 'test',
            txDateFiatInfo: null,
            frontendMetadata: {
                initialNotes: null,
                recipientMatrixId: null,
                senderMatrixId: null,
            },
            outcomeTime: Date.now(),
            kind: 'lnReceive' as const,
            ln_invoice: 'lnbc123',
            state: { type: 'claimed' } as RpcLnReceiveState,
        }
        mockSelectorValues({
            selectMatrixAuth: { userId: 'npub123' },
        })
        mockFedimint.getTransaction.mockResolvedValue(mockTransaction)

        const event = createMockPaymentEvent({
            senderId: 'npub123',
            senderOperationId: 'sender-op-123',
        })

        const { result } = renderHook(() =>
            useMatrixPaymentTransaction({
                event,
                fedimint: mockFedimint,
            }),
        )

        await waitFor(() => {
            expect(result.current.transaction).toBeDefined()
            expect(result.current.transaction).not.toBeNull()
        })

        expect(result.current.transaction).toEqual(mockTransaction)
        expect(result.current.isLoading).toBe(false)
    })
})
