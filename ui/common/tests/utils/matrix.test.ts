import { MatrixEvent, MatrixEventStatus } from '../../types'
import {
    decodeFediMatrixUserUri,
    encodeFediMatrixUserUri,
    filterMultispendEvents,
    isValidMatrixUserId,
    MatrixEventContentType,
    isMultispendReannounceEvent,
} from '../../utils/matrix'

describe('encodeFediMatrixUserUri', () => {
    it('encodes a user URI', () => {
        expect(encodeFediMatrixUserUri('@user:example.com')).toBe(
            'fedi:user:@user:example.com',
        )
    })
})

describe('decodeFediMatrixUserUri', () => {
    it('decodes a user URI', () => {
        expect(decodeFediMatrixUserUri('fedi:user:@user:example.com')).toBe(
            '@user:example.com',
        )
    })

    it('decodes a user URI with ://', () => {
        expect(decodeFediMatrixUserUri('fedi://user:@user:example.com')).toBe(
            '@user:example.com',
        )
    })

    it('throws an error if the URI is valid but the user id is not valid', () => {
        expect(() => decodeFediMatrixUserUri('fedi:user:invalid')).toThrow(
            'feature.chat.invalid-member',
        )
    })

    it('throws an error if the URI is not valid', () => {
        expect(() => decodeFediMatrixUserUri('invalid')).toThrow(
            'feature.chat.invalid-member',
        )
    })
})

describe('isValidMatrixUserId', () => {
    it('returns true if the user id is valid', () => {
        expect(isValidMatrixUserId('@user:example.com')).toBe(true)
    })

    it('returns false if the user id is not valid', () => {
        expect(isValidMatrixUserId('invalid')).toBe(false)
    })
})

const mockGroupAnnounceEvent: MatrixEvent<
    MatrixEventContentType<'xyz.fedi.multispend'>
> = {
    id: '1',
    content: {
        msgtype: 'xyz.fedi.multispend',
        body: 'Test message',
        kind: 'groupReannounce',
        invitationId: 'iid1',
        invitation: {
            signers: ['@user1:m1.8fa.in', '@user2:m1.8fa.in'],
            threshold: 2,
            federationInviteCode: 'fed1abc',
            federationName: 'testfed',
        },
        proposer: '@user1:m1.8fa.in',
        pubkeys: {
            '@user1:m1.8fa.in': 'pubkey123',
            '@user2:m1.8fa.in': 'pubkey456',
        },
        rejections: [],
    },
    status: MatrixEventStatus.sent,
    roomId: '@room1:m1.8fa.in',
    senderId: '@user1:m1.8fa.in',
    timestamp: Date.now(),
    error: null,
}

const mockChatEvent: MatrixEvent<MatrixEventContentType<'m.text'>> = {
    id: '2',
    content: {
        msgtype: 'm.text',
        body: 'Test message 1',
    },
    status: MatrixEventStatus.sent,
    roomId: '@room1:m1.8fa.in',
    senderId: '@user1:m1.8fa.in',
    timestamp: Date.now(),
    error: null,
}

const mockMatrixEvents: MatrixEvent[] = [mockGroupAnnounceEvent, mockChatEvent]

describe('filterMultispendEvents', () => {
    it('should not return groupAnnounceEvent', () => {
        const filteredEvents = filterMultispendEvents(mockMatrixEvents)
        expect(filteredEvents.length).toBe(1)
        expect(filteredEvents[0].id).toBe('2')
    })
})

describe('isMultispendReannounceEvent', () => {
    it('returns true if the event is a multispend reannounce event', () => {
        expect(isMultispendReannounceEvent(mockGroupAnnounceEvent)).toBe(true)
    })

    it('returns false if the event is not a multispend reannounce event', () => {
        expect(isMultispendReannounceEvent(mockChatEvent)).toBe(false)
    })
})
