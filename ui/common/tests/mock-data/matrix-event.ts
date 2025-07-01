import {
    MatrixEvent,
    MatrixEventStatus,
    MatrixPaymentEvent,
    MatrixPaymentStatus,
} from '@fedi/common/types'
import { MatrixEventContentType } from '@fedi/common/utils/matrix'

// Mock payment event factory
export const createMockPaymentEvent = (
    overrides: any = {},
): MatrixPaymentEvent => {
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

export const mockMatrixEventImage: MatrixEvent<
    MatrixEventContentType<'m.image'>
> = {
    content: {
        body: 'B27534A5-B070-480F-9093-3A2EFA8BF3F4.png',
        msgtype: 'm.image',
        info: {
            mimetype: 'image/png',
            size: 10000,
            w: 100,
            h: 100,
        },
        file: {
            hashes: {
                sha256: 'test',
            },
            url: 'mxc://m1.8fa.in/HIIFNqoGfANjvFOEDULIPoKy',
            v: 'v2',
        },
    },
    error: null,
    eventId: '$lZ5PilJSxLL_OBo0_bZuva7Z-Wnw-tMN9Um1DBpw0Yk',
    id: '14',
    roomId: '!tErPyFRkaElRGYRAyQ:m1.8fa.in',
    senderId:
        '@npub1rvlu99xmn62wn5neseg3dayjp857tzu6yeefnwr4ctrqkn5h08wqttl4ja:m1.8fa.in',
    status: MatrixEventStatus.sent,
    timestamp: 1750083034389,
    txnId: undefined,
}

export const mockMatrixEventVideo: MatrixEvent<
    MatrixEventContentType<'m.video'>
> = {
    content: {
        body: 'B27534A5-B070-480F-9093-3A2EFA8BF3F4.mp4',
        msgtype: 'm.video',
        info: {
            mimetype: 'video/mp4',
            size: 10000,
            w: 100,
            h: 100,
        },
        file: {
            hashes: {
                sha256: 'test',
            },
            url: 'mxc://m1.8fa.in/HIIFNqoGfANjvFOEDULIPoKy',
            v: 'v2',
        },
    },
    error: null,
    eventId: '$lZ5PilJSxLL_OBo0_bZuva7Z-Wnw-tMN9Um1DBpw0Yk',
    id: '14',
    roomId: '!tErPyFRkaElRGYRAyQ:m1.8fa.in',
    senderId:
        '@npub1rvlu99xmn62wn5neseg3dayjp857tzu6yeefnwr4ctrqkn5h08wqttl4ja:m1.8fa.in',
    status: MatrixEventStatus.sent,
    timestamp: 1750083034389,
    txnId: undefined,
}
