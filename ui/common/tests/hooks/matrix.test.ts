import { renderHook, waitFor } from '@testing-library/react'

import { useMatrixPaymentTransaction } from '@fedi/common/hooks/matrix'
import { createMockPaymentEvent } from '@fedi/common/tests/mock-data/matrix-event'
import { createMockTransaction } from '@fedi/common/tests/mock-data/transactions'
import {
    mockFedimint,
    mockSelectorValues,
} from '@fedi/common/tests/setup/jest.setup'

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
            content: {
                senderId: 'npub123',
                senderOperationId: undefined,
            },
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
        const mockTransaction = createMockTransaction()
        mockSelectorValues({
            selectMatrixAuth: { userId: 'npub123' },
        })
        mockFedimint.getTransaction.mockResolvedValue(mockTransaction)

        const event = createMockPaymentEvent({
            content: {
                senderId: 'npub123',
                senderOperationId: 'sender-op-123',
            },
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
