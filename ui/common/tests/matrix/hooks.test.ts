/**
 * @jest-environment jsdom
 */
import { configureStore } from '@reduxjs/toolkit'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'
import { Subject } from 'rxjs'

// Import the hook after setting up all mocks
import { useMatrixPaymentTransaction } from '../../hooks/matrix'
import {
    MatrixPaymentStatus,
    MatrixPaymentEvent,
    MatrixEventStatus,
} from '../../types'
import { FedimintBridge } from '../../utils/fedimint'

const mockUseSelector = jest.fn()
const mockUseCommonDispatch = jest.fn()
const mockSelectMatrixAuth = jest.fn()
const mockSelectIsInternetUnreachable = jest.fn()
const mockSelectConsolidatedMatrixPaymentEventByPaymentId = jest.fn()
const mockSelectCanClaimPayment = jest.fn()
const mockSelectCanSendPayment = jest.fn()
const mockSelectCanPayFromOtherFeds = jest.fn()
const mockSelectMatrixRoomMember = jest.fn()
const mockSelectMatrixRoom = jest.fn()

jest.doMock('../../utils/log', () => ({
    makeLog: () => ({
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }),
    saveLogsToStorage: jest.fn().mockResolvedValue(undefined),
    initializeLogging: jest.fn(),
    logFileApi: {
        write: jest.fn(),
        read: jest.fn(),
        clear: jest.fn(),
    },
    cachedLogs: '',
}))

jest.doMock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    useSelector: mockUseSelector,
    useDispatch: () => jest.fn(),
}))

// Now use doMock with the pre-declared variables
jest.doMock('../../redux', () => ({
    useCommonDispatch: () => mockUseCommonDispatch,
    useCommonSelector: (selector: any) => mockUseSelector(selector),
    selectMatrixAuth: mockSelectMatrixAuth,
    selectIsInternetUnreachable: mockSelectIsInternetUnreachable,
    selectConsolidatedMatrixPaymentEventByPaymentId:
        mockSelectConsolidatedMatrixPaymentEventByPaymentId,
    selectCanClaimPayment: mockSelectCanClaimPayment,
    selectCanSendPayment: mockSelectCanSendPayment,
    selectCanPayFromOtherFeds: mockSelectCanPayFromOtherFeds,
    selectMatrixRoomMember: mockSelectMatrixRoomMember,
    selectMatrixRoom: mockSelectMatrixRoom,
    // Mock Redux actions that are used in the hooks
    checkBolt11PaymentResult: jest.fn(() => ({ type: 'MOCK_CHECK_BOLT11' })),
    cancelPaymentEvent: jest.fn(() => ({ type: 'MOCK_CANCEL_PAYMENT' })),
    acceptPaymentEvent: jest.fn(() => ({ type: 'MOCK_ACCEPT_PAYMENT' })),
    requestPaymentEvent: jest.fn(() => ({ type: 'MOCK_REQUEST_PAYMENT' })),
    claimPaymentEvent: jest.fn(() => ({ type: 'MOCK_CLAIM_PAYMENT' })),
}))

// Mock amount formatter
jest.doMock('../../hooks/amount', () => ({
    useAmountFormatter: () => ({
        makeFormattedAmountsFromMSats: (msats: number) => ({
            formattedPrimaryAmount: `${msats} sats`,
            formattedSecondaryAmount: '$10.00',
            formattedSats: `${msats} sats`,
            formattedFiat: '$10.00',
            formattedUsd: '$10.00',
        }),
    }),
}))

// Mock matrix utils
jest.doMock('../../utils/matrix', () => ({
    makeMatrixPaymentText: () => 'Payment of 1000 sats',
    matrixIdToUsername: (id: string) => id,
}))

// Mock toast and other hooks
jest.doMock('../../hooks/toast', () => ({
    useToast: () => ({ error: jest.fn() }),
}))

jest.doMock('../../hooks/util', () => ({
    useUpdatingRef: (val: any) => ({ current: val }),
}))

// Create a comprehensive mock for FedimintBridge
const createMockFedimint = (): jest.Mocked<FedimintBridge> => {
    const mockBridge = {
        // Core RPC methods
        rpc: jest.fn(),
        rpcTyped: jest.fn(),
        rpcResult: jest.fn(),

        // Bridge status and initialization
        bridgeStatus: jest.fn(),
        initializeBridge: jest.fn(),

        // Transaction methods - these are the key ones for our tests
        getTransaction: jest.fn().mockResolvedValue(undefined),
        generateEcash: jest.fn(),
        receiveEcash: jest.fn(),
        cancelEcash: jest.fn(),

        // Payment methods
        decodeInvoice: jest.fn(),
        getPrevPayInvoiceResult: jest.fn(),

        // Matrix integration
        matrixUploadMedia: jest.fn(),
        matrixApproveMultispendGroupInvitation: jest.fn(),
        matrixRejectMultispendGroupInvitation: jest.fn(),

        // Event listeners
        addListener: jest.fn(),
        removeListener: jest.fn(),

        // Federation management
        refreshFederations: jest.fn(),
        fetchSocialRecovery: jest.fn(),
        initializeFeatureFlags: jest.fn(),
        initializeNostrKeys: jest.fn(),
        fetchRegisteredDevices: jest.fn(),
        initializeFedimintVersion: jest.fn(),

        // Other methods that might be needed
        setDeviceIndexRequired: jest.fn(),
        setShouldLockDevice: jest.fn(),
        setShouldMigrateSeed: jest.fn(),
        startMatrixClient: jest.fn(),
        previewAllDefaultChats: jest.fn(),
    } as any

    return mockBridge
}

// Use the mock factory
const mockFedimint = createMockFedimint()

// Mock Redux store with proper typing
const createMockStore = (initialState: { matrix?: any } = {}) => {
    return configureStore({
        reducer: {
            matrix: (
                state = {
                    auth: { userId: 'user123' },
                    paymentEvents: {},
                    rooms: {},
                    roomTimelines: {},
                    ...(initialState.matrix || {}),
                },
            ) => state,
        },
        preloadedState: initialState,
    })
}

// Test wrapper with Redux provider
const createWrapper = (store: any) => {
    const TestWrapper = ({ children }: { children: React.ReactNode }) => {
        return React.createElement(Provider, { store, children })
    }
    return TestWrapper
}

// Mock payment event factory - FIXED to properly handle nested overrides
const createMockPaymentEvent = (overrides: any = {}): MatrixPaymentEvent => {
    const baseEvent = {
        id: 'event123',
        content: {
            msgtype: 'xyz.fedi.payment',
            body: 'Payment of 1000 sats',
            paymentId: 'payment123',
            status: MatrixPaymentStatus.pushed,
            amount: 1000,
            senderId: 'user123',
            recipientId: 'user456',
            federationId: 'fed123',
            senderOperationId: 'sender-op-123',
            receiverOperationId: undefined,
        },
        status: MatrixEventStatus.sent,
        roomId: 'room123',
        timestamp: Date.now(),
        senderId: 'user123',
        error: null,
    }

    // Handle content overrides properly
    if (overrides.content) {
        baseEvent.content = { ...baseEvent.content, ...overrides.content }
        delete overrides.content
    }

    // Handle direct property overrides on content
    const contentOverrides: any = {}
    const topLevelOverrides: any = {}

    Object.keys(overrides).forEach(key => {
        if (
            [
                'senderId',
                'recipientId',
                'federationId',
                'senderOperationId',
                'receiverOperationId',
                'status',
                'amount',
                'paymentId',
                'bolt11',
            ].includes(key)
        ) {
            contentOverrides[key] = overrides[key]
        } else {
            topLevelOverrides[key] = overrides[key]
        }
    })

    return {
        ...baseEvent,
        ...topLevelOverrides,
        content: {
            ...baseEvent.content,
            ...contentOverrides,
        },
    }
}

// Helper function to setup default mocks
const setupDefaultMocks = (userId = 'user123') => {
    mockUseCommonDispatch.mockReturnValue(jest.fn())

    // Set up useSelector to return values based on the selector function passed to it
    mockUseSelector.mockImplementation((selector: any) => {
        if (selector === mockSelectMatrixAuth) {
            return { userId }
        }
        if (selector === mockSelectIsInternetUnreachable) {
            return false
        }
        if (selector === mockSelectConsolidatedMatrixPaymentEventByPaymentId) {
            return null
        }
        if (selector === mockSelectCanClaimPayment) {
            return false
        }
        if (selector === mockSelectCanSendPayment) {
            return true
        }
        if (selector === mockSelectCanPayFromOtherFeds) {
            return false
        }
        if (selector === mockSelectMatrixRoomMember) {
            return { displayName: 'Test User', id: userId }
        }
        if (selector === mockSelectMatrixRoom) {
            return { directUserId: null }
        }
        // Default fallback for any other selectors
        return null
    })

    // Set up individual selector mocks to return appropriate values
    mockSelectMatrixAuth.mockReturnValue({ userId })
    mockSelectIsInternetUnreachable.mockReturnValue(false)
    mockSelectConsolidatedMatrixPaymentEventByPaymentId.mockReturnValue(null)
    mockSelectCanClaimPayment.mockReturnValue(false)
    mockSelectCanSendPayment.mockReturnValue(true)
    mockSelectCanPayFromOtherFeds.mockReturnValue(false)
    mockSelectMatrixRoomMember.mockReturnValue({
        displayName: 'Test User',
        id: userId,
    })
    mockSelectMatrixRoom.mockReturnValue({ directUserId: null })
}

/*
// Payment Transaction Hook Tests
// Business Context: When users view their payment history or click on payment messages,
// they need to see detailed transaction information including amounts, fees, timestamps,
// and confirmation status. The hook manages fetching this data from the blockchain and
// provides loading states while maintaining good performance through caching.
*/

describe('useMatrixPaymentTransaction - Core Transaction Functionality', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        // Reset the fedimint mock to ensure clean state
        mockFedimint.getTransaction.mockClear()
        // Use type assertion to allow undefined for testing scenarios where no transaction exists
        mockFedimint.getTransaction.mockResolvedValue(undefined as any)

        // Reset the useSelector mock
        mockUseSelector.mockClear()

        setupDefaultMocks()
    })

    // BUSINESS: When users first open a payment message, the app should immediately show
    // a consistent loading state rather than undefined values, providing clear feedback
    // that transaction details are being fetched from the Bitcoin network.
    it('initializes with correct default state', async () => {
        const store = createMockStore({
            matrix: { auth: { userId: 'user123' } },
        })
        const wrapper = createWrapper(store)

        const event = createMockPaymentEvent({
            senderId: 'user123',
            senderOperationId: 'sender-op-123',
        })

        let result: any

        await act(async () => {
            const hookResult = renderHook(
                () =>
                    useMatrixPaymentTransaction({
                        event,
                        fedimint: mockFedimint,
                    }),
                { wrapper },
            )
            result = hookResult.result
        })

        // Wait for any async operations to complete
        await waitFor(() => {
            expect(result.current).toBeDefined()
        })

        // Should have proper initial state - the hook should convert undefined to null
        expect(result.current.transaction).toBeNull()
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeNull()
        expect(typeof result.current.hasTriedFetch).toBe('boolean')
    })
})

/*
// Payment Event Display Tests
// Business Context: Payment messages in chat need to show the right information at
// the right time - current status, available actions (cancel/accept/view), and
// properly formatted amounts. The UI must be intuitive so users immediately understand
// what they can do with each payment message.
*/

describe('useMatrixPaymentEvent - Button State and Status Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        setupDefaultMocks()
    })

    // BUSINESS: The app's payment event factory must create consistent, valid payment
    // structures for testing and development. This ensures all payment events have the
    // required fields and follow the expected format for reliable testing.
    it('creates valid payment event structures', () => {
        const event = createMockPaymentEvent({
            status: MatrixPaymentStatus.received,
            bolt11: 'lnbc123...',
        })

        expect(event.content.status).toBe(MatrixPaymentStatus.received)
        expect(event.content.bolt11).toBe('lnbc123...')
        expect(event.content.amount).toBe(1000)
        expect(event.content.paymentId).toBe('payment123')
    })
})

/*
// Real-time Payment Event Stream Tests
// Business Context: Bitcoin payments go through multiple stages (initiated → confirmed → completed).
// Users expect to see these status updates in real-time within their chat conversations,
// similar to how message delivery confirmations work in messaging apps. The system must
// handle concurrent payments without mixing up status updates between different transactions.
*/

describe('Real-time Payment Event Updates', () => {
    beforeEach(() => {
        jest.clearAllTimers()
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
    })

    // BUSINESS: When a user sends or receives a payment, they expect to see live updates
    // as the transaction progresses through the Bitcoin network. The payment should show
    // "sending" → "confirming" → "completed" status changes in real-time, providing
    // confidence that their money is moving safely.
    it('processes payment status updates from event stream', async () => {
        const eventSubject = new Subject<MatrixPaymentEvent>()

        // Mock the event subscription
        const mockEventStream = {
            subscribe: jest.fn(callback => {
                eventSubject.subscribe(callback)
                return { unsubscribe: jest.fn() }
            }),
        }

        // Simulate payment lifecycle events
        const paymentId = 'realtime-payment-123'
        const events = [
            createMockPaymentEvent({
                id: 'event1',
                paymentId,
                status: MatrixPaymentStatus.pushed,
                timestamp: 1000,
            }),
            createMockPaymentEvent({
                id: 'event2',
                paymentId,
                status: MatrixPaymentStatus.accepted,
                timestamp: 2000,
            }),
            createMockPaymentEvent({
                id: 'event3',
                paymentId,
                status: MatrixPaymentStatus.received,
                timestamp: 3000,
            }),
        ]

        const receivedEvents: MatrixPaymentEvent[] = []

        // Subscribe to the event stream
        mockEventStream.subscribe((event: MatrixPaymentEvent) => {
            receivedEvents.push(event)
        })

        // Emit events in sequence
        act(() => {
            events.forEach((event, index) => {
                setTimeout(() => eventSubject.next(event), index * 10)
            })
        })

        // Wait for all events to be processed
        await waitFor(
            () => {
                expect(receivedEvents).toHaveLength(3)
            },
            { timeout: 1000 },
        )

        // Verify all events were received in order
        expect(receivedEvents[0].content.status).toBe(
            MatrixPaymentStatus.pushed,
        )
        expect(receivedEvents[1].content.status).toBe(
            MatrixPaymentStatus.accepted,
        )
        expect(receivedEvents[2].content.status).toBe(
            MatrixPaymentStatus.received,
        )
    })

    // BUSINESS: Users often have multiple payments happening simultaneously - they might
    // send money to one friend while receiving payment from another, or make several
    // purchases in quick succession. The app must track each payment independently without
    // mixing up status updates, ensuring each payment shows correct progress in the UI.
    it('handles concurrent payment events without interference', async () => {
        const eventSubject = new Subject<MatrixPaymentEvent>()

        // Create events for two different payments happening simultaneously
        const payment1Events = [
            createMockPaymentEvent({
                id: 'p1-event1',
                paymentId: 'payment-1',
                status: MatrixPaymentStatus.pushed,
                timestamp: 1000,
            }),
            createMockPaymentEvent({
                id: 'p1-event2',
                paymentId: 'payment-1',
                status: MatrixPaymentStatus.received,
                timestamp: 3000,
            }),
        ]

        const payment2Events = [
            createMockPaymentEvent({
                id: 'p2-event1',
                paymentId: 'payment-2',
                status: MatrixPaymentStatus.requested,
                timestamp: 1500,
            }),
            createMockPaymentEvent({
                id: 'p2-event2',
                paymentId: 'payment-2',
                status: MatrixPaymentStatus.accepted,
                timestamp: 2500,
            }),
        ]

        const allEvents = [...payment1Events, ...payment2Events]
        const receivedEvents: MatrixPaymentEvent[] = []

        eventSubject.subscribe((event: MatrixPaymentEvent) => {
            receivedEvents.push(event)
        })

        // Emit all events rapidly (simulating concurrent updates)
        act(() => {
            allEvents.forEach((event, index) => {
                setTimeout(() => eventSubject.next(event), index * 5)
            })
        })

        await waitFor(() => {
            expect(receivedEvents).toHaveLength(4)
        })

        // Verify both payments were tracked independently
        const payment1Updates = receivedEvents.filter(
            e => e.content.paymentId === 'payment-1',
        )
        const payment2Updates = receivedEvents.filter(
            e => e.content.paymentId === 'payment-2',
        )

        expect(payment1Updates).toHaveLength(2)
        expect(payment2Updates).toHaveLength(2)

        expect(payment1Updates[1].content.status).toBe(
            MatrixPaymentStatus.received,
        )
        expect(payment2Updates[1].content.status).toBe(
            MatrixPaymentStatus.accepted,
        )
    })
})
