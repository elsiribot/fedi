import {
    MatrixPaymentStatus,
    MatrixPaymentEvent,
    MatrixEventStatus,
} from '../../types'
import { calculateHistoricalFiatAmount } from '../../utils/currency'
import { consolidatePaymentEvents } from '../../utils/matrix'

const createMockNonPaymentEvent = (id: any, timestamp: number) =>
    ({
        id,
        type: 'm.room.message',
        roomId: 'room123',
        senderId: 'user1',
        timestamp,
        status: null,
        error: null,
        content: {
            msgtype: 'm.text' as const,
            body: 'Hello world',
            originalContent: {
                msgtype: 'm.text' as const,
                body: 'Hello world',
            },
        },
    }) as any

const createMockPaymentEvent = (
    id: any,
    paymentId: any,
    status: MatrixPaymentStatus,
    timestamp: number,
    senderOperationId = 'default-sender-op',
    receiverOperationId?: string,
): MatrixPaymentEvent =>
    ({
        id,
        content: {
            msgtype: 'xyz.fedi.payment',
            body: `Payment of 1000 sats`,
            paymentId,
            status,
            amount: 1000,
            senderId: 'user1',
            recipientId: 'user2',
            federationId: 'fed123',
            senderOperationId,
            receiverOperationId,
        },
        status: MatrixEventStatus.sent,
        roomId: 'room123',
        timestamp,
        senderId: 'user1',
        error: null,
    }) as any
/*
// Payment Event Consolidation Tests
// Business Context: When users send payments, multiple events are created (push, accept, receive).
// The app needs to show only one message per payment while keeping it updated with the latest status.
// This ensures a clean chat experience without duplicate payment messages.
*/

// BUSINESS: App handles empty chat rooms gracefully
it('returns empty array when given empty input', () => {
    expect(consolidatePaymentEvents([])).toEqual([])
})

// BUSINESS: App filters out corrupted/invalid events and prevents duplicate messages
it('filters out null events and deduplicates by event ID', () => {
    const event1 = createMockNonPaymentEvent('event1', 1000)
    const event1Duplicate = createMockNonPaymentEvent('event1', 2000)
    const events = [event1, null, event1Duplicate, null]

    const result = consolidatePaymentEvents(events)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('event1')
    expect(result[0].timestamp).toBe(1000) // keeps first occurrence
})

// BUSINESS: Regular text messages remain unchanged while payment events get special processing
it('keeps non-payment events unchanged', () => {
    const textEvent = createMockNonPaymentEvent('text1', 1000)
    const paymentEvent = createMockPaymentEvent(
        'payment1',
        'pay123',
        MatrixPaymentStatus.pushed,
        2000,
    )

    const result = consolidatePaymentEvents([textEvent, paymentEvent])

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(textEvent)
})

// BUSINESS: Users see only one message per payment (not 3 separate push/accept/receive messages)
it('shows only initial payment events (pushed/requested) for each paymentId', () => {
    const pushedEvent = createMockPaymentEvent(
        'event1',
        'pay123',
        MatrixPaymentStatus.pushed,
        1000,
    )
    const acceptedEvent = createMockPaymentEvent(
        'event2',
        'pay123',
        MatrixPaymentStatus.accepted,
        2000,
    )
    const receivedEvent = createMockPaymentEvent(
        'event3',
        'pay123',
        MatrixPaymentStatus.received,
        3000,
    )

    const result = consolidatePaymentEvents([
        pushedEvent,
        acceptedEvent,
        receivedEvent,
    ])

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('event1') // shows the initial pushed event
})

// BUSINESS: Payment message shows current status (completed/pending) not the original status
it('merges latest status into initial event content', () => {
    const pushedEvent = createMockPaymentEvent(
        'event1',
        'pay123',
        MatrixPaymentStatus.pushed,
        1000,
        'sender-op-123',
    )
    const receivedEvent = createMockPaymentEvent(
        'event2',
        'pay123',
        MatrixPaymentStatus.received,
        3000,
        'sender-op-123',
        'receiver-op-456',
    )

    const result = consolidatePaymentEvents([pushedEvent, receivedEvent])

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('event1') // original event ID

    // Type-safe access to payment event content
    const paymentEvent = result[0] as MatrixPaymentEvent
    expect(paymentEvent.content.status).toBe(MatrixPaymentStatus.received) // updated status
    expect(paymentEvent.content.receiverOperationId).toBe('receiver-op-456') // merged data
})

// BUSINESS: App preserves transaction history links when older clients send incomplete updates
it('preserves existing operation IDs when latest event has null values', () => {
    const pushedEvent = createMockPaymentEvent(
        'event1',
        'pay123',
        MatrixPaymentStatus.pushed,
        1000,
        'sender-op-123',
        'receiver-op-original',
    )
    const updateEvent = createMockPaymentEvent(
        'event2',
        'pay123',
        MatrixPaymentStatus.accepted,
        2000,
        'sender-op-123', // keep existing
        undefined, // don't overwrite with undefined
    )

    const result = consolidatePaymentEvents([pushedEvent, updateEvent])

    const paymentEvent = result[0] as MatrixPaymentEvent
    expect(paymentEvent.content.senderOperationId).toBe('sender-op-123')
    expect(paymentEvent.content.receiverOperationId).toBe(
        'receiver-op-original',
    )
})

// BUSINESS: Payment requests are prioritized for display over sent payments
it('prefers requested events over other initial events for display', () => {
    const pushedEvent = createMockPaymentEvent(
        'event1',
        'pay123',
        MatrixPaymentStatus.pushed,
        2000,
    )
    const requestedEvent = createMockPaymentEvent(
        'event2',
        'pay123',
        MatrixPaymentStatus.requested,
        1000, // earlier timestamp
    )

    const result = consolidatePaymentEvents([pushedEvent, requestedEvent])

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('event2') // shows the requested event
    const paymentEvent = result[0] as MatrixPaymentEvent
    expect(paymentEvent.content.status).toBe(MatrixPaymentStatus.pushed) // but with latest status
})

// BUSINESS: Multiple payments in same chat are handled independently
it('handles multiple different payment IDs correctly', () => {
    const payment1Event = createMockPaymentEvent(
        'event1',
        'pay123',
        MatrixPaymentStatus.pushed,
        1000,
    )
    const payment2Event = createMockPaymentEvent(
        'event2',
        'pay456',
        MatrixPaymentStatus.requested,
        2000,
    )
    const payment1Update = createMockPaymentEvent(
        'event3',
        'pay123',
        MatrixPaymentStatus.received,
        3000,
    )

    const result = consolidatePaymentEvents([
        payment1Event,
        payment2Event,
        payment1Update,
    ])

    expect(result).toHaveLength(2)

    // Type-safe way to find payment events
    const payment1Result = result.find(e => {
        return (
            e.content.msgtype === 'xyz.fedi.payment' &&
            (e.content as any).paymentId === 'pay123'
        )
    }) as MatrixPaymentEvent

    const payment2Result = result.find(e => {
        return (
            e.content.msgtype === 'xyz.fedi.payment' &&
            (e.content as any).paymentId === 'pay456'
        )
    }) as MatrixPaymentEvent

    expect(payment1Result.content.status).toBe(MatrixPaymentStatus.received)
    expect(payment2Result.content.status).toBe(MatrixPaymentStatus.requested)
})

// BUSINESS: When multiple initial events exist, show the earliest one for consistent display
it('uses earliest timestamp when both events have same initial status', () => {
    const requestedEvent1 = createMockPaymentEvent(
        'event1',
        'pay123',
        MatrixPaymentStatus.requested,
        2000,
    )
    const requestedEvent2 = createMockPaymentEvent(
        'event2',
        'pay123',
        MatrixPaymentStatus.requested,
        1000, // earlier
    )

    const result = consolidatePaymentEvents([requestedEvent1, requestedEvent2])

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('event2') // earlier event chosen
})

/*
// Historical Exchange Rate Tests
// Business Context: When users view old payments, they want to see what the Bitcoin
// was worth at the time of the transaction, not current prices. This gives accurate
// historical context for their spending.
*/

describe('calculateHistoricalFiatAmount', () => {
    // BUSINESS: App handles missing exchange rate data gracefully
    it('returns null when fiatFXInfo is null', () => {
        const result = calculateHistoricalFiatAmount(100000 as any, null)
        expect(result).toBeNull()
    })

    // BUSINESS: App handles missing exchange rate data gracefully
    it('returns null when fiatFXInfo is undefined', () => {
        const result = calculateHistoricalFiatAmount(
            100000 as any,
            undefined as any,
        )
        expect(result).toBeNull()
    })

    // BUSINESS: User sees accurate historical value for their Bitcoin transactions
    it('calculates correct fiat amount from msats using historical rate', () => {
        const fiatFXInfo = {
            btcToFiatHundredths: 5000000, // $50,000.00 per BTC in hundredths
            fiatCode: 'USD',
        }
        const msats = 100000000000 as any // 1 BTC in msats

        const result = calculateHistoricalFiatAmount(msats, fiatFXInfo)

        expect(result).toEqual({
            amount: 50000,
            currency: 'USD',
        })
    })

    // BUSINESS: Partial Bitcoin amounts show accurate historical values
    it('handles fractional BTC amounts correctly', () => {
        const fiatFXInfo = {
            btcToFiatHundredths: 4000000, // $40,000.00 per BTC
            fiatCode: 'USD',
        }
        const msats = 50000000000 as any // 0.5 BTC in msats

        const result = calculateHistoricalFiatAmount(msats, fiatFXInfo)

        expect(result).toEqual({
            amount: 20000,
            currency: 'USD',
        })
    })

    // BUSINESS: Small payments (coffee purchases) show accurate historical cents
    it('handles small amounts with proper decimal precision', () => {
        const fiatFXInfo = {
            btcToFiatHundredths: 5000000, // $50,000.00 per BTC
            fiatCode: 'USD',
        }
        const msats = 1000000 as any // 0.00001 BTC (1000 sats)

        const result = calculateHistoricalFiatAmount(msats, fiatFXInfo)

        expect(result).toEqual({
            amount: expect.closeTo(0.5, 5), // $0.50 with floating point tolerance
            currency: 'USD',
        })
    })

    // BUSINESS: App works globally with different fiat currencies
    it('works with different fiat currencies', () => {
        const fiatFXInfo = {
            btcToFiatHundredths: 4500000, // €45,000.00 per BTC
            fiatCode: 'EUR',
        }
        const msats = 10000000000 as any // 0.1 BTC

        const result = calculateHistoricalFiatAmount(msats, fiatFXInfo)

        expect(result).toEqual({
            amount: 4500,
            currency: 'EUR',
        })
    })

    // BUSINESS: Zero-value transactions display correctly
    it('handles zero msats', () => {
        const fiatFXInfo = {
            btcToFiatHundredths: 5000000,
            fiatCode: 'USD',
        }
        const msats = 0 as any

        const result = calculateHistoricalFiatAmount(msats, fiatFXInfo)

        expect(result).toEqual({
            amount: 0,
            currency: 'USD',
        })
    })

    // BUSINESS: Large institutional payments display accurate historical values
    it('handles very large amounts', () => {
        const fiatFXInfo = {
            btcToFiatHundredths: 6000000, // $60,000.00 per BTC
            fiatCode: 'USD',
        }
        const msats = 2100000000000000 as any // 21 BTC (max supply scenario)

        const result = calculateHistoricalFiatAmount(msats, fiatFXInfo)

        expect(result).toEqual({
            amount: 1260000000, // The actual calculated value based on the formula
            currency: 'USD',
        })
    })
})
