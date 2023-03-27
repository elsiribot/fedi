import { XMPP_MUC_DOMAIN } from '../../constants'
import { Group, Message, Payment, PaymentStatus } from '../../types'
import xmlUtils, {
    EnterMucRoomPresence,
    GroupChatMessage,
    SetRoomConfigQuery,
    UpdatePaymentMessage,
} from '../../utils/XmlUtils'

jest.mock('../../constants', () => ({
    XMPP_DEFAULT_PAGE_LIMIT: 10,
    XMPP_MUC_DOMAIN: 'domain',
}))
jest.mock('../../localization/i18n', () => ({
    i18n: {
        t: jest.fn(),
    },
}))

describe('XmlUtils', () => {
    describe('buildQuery: SetRoomConfig', () => {
        it('response contains all of the provided values', () => {
            const result = xmlUtils.buildQuery(
                new SetRoomConfigQuery({
                    roomName: 'a new room name',
                    from: 'fromjid@domain',
                    to: 'tojid@domain',
                }),
            )
            const stringified = result.toString()

            expect(stringified).toContain('a new room name')
            expect(stringified).toContain('fromjid')
            expect(stringified).toContain('tojid')
        })
        it('response contains the correct query ID', () => {
            const result = xmlUtils.buildQuery(
                new SetRoomConfigQuery({
                    roomName: 'a new room name',
                    from: 'fromjid@domain',
                    to: 'tojid@domain',
                }),
            )
            const queryId = result.getAttr('id')

            expect(queryId).toContain(SetRoomConfigQuery.id)
        })
    })
    describe('buildPresence: EnterMucRoom', () => {
        it('response contains all of the provided values', () => {
            const groupId = 'testgroup'
            const from = 'user@domain'
            const mucDomain = XMPP_MUC_DOMAIN

            const result = xmlUtils.buildPresence(
                new EnterMucRoomPresence({
                    groupId,
                    from,
                }),
            )

            const toValue = result.getAttr('to')
            const fromValue = result.getAttr('from')
            const xmlnsValue = result.getChild('x')?.getAttr('xmlns')

            expect(toValue).toEqual(`${groupId}@${mucDomain}/user`)
            expect(fromValue).toEqual(from)
            expect(xmlnsValue).toEqual('http://jabber.org/protocol/muc')
        })

        it('response contains the correct presence ID', () => {
            const result = xmlUtils.buildPresence(
                new EnterMucRoomPresence({
                    groupId: 'testgroup',
                    from: 'user@domain',
                }),
            )
            const presenceId = result.getAttr('id')

            expect(presenceId).toContain(EnterMucRoomPresence.id)
        })
    })

    describe('buildMessage: GroupChatMessage', () => {
        it('response contains all of the provided values', () => {
            const result = xmlUtils.buildMessage(
                new GroupChatMessage({
                    from: 'fromjid@domain',
                    toGroup: new Group({ id: 'groupid' }),
                    message: new Message({
                        id: 'group-chat-message-uuid',
                        content: 'This is a test message',
                    }),
                }),
            )
            const fromAttr = result.getAttr('from')
            const toAttr = result.getAttr('to')
            const body = result.getChild('body')?.getText()

            expect(fromAttr).toEqual('fromjid@domain')
            expect(toAttr).toEqual('groupid@domain')
            expect(body).toEqual('This is a test message')
        })

        it('response contains the message ID', () => {
            const result = xmlUtils.buildMessage(
                new GroupChatMessage({
                    from: 'fromjid@domain',
                    toGroup: new Group({ id: 'groupid' }),
                    message: new Message({
                        id: 'group-chat-message-uuid',
                        content: 'This is a test message',
                    }),
                }),
            )
            const messageId = result.getAttr('id')

            expect(messageId).toContain('group-chat-message-uuid')
        })
    })

    describe('buildMessage: UpdatePaymentMessage', () => {
        it('response contains all of the provided values', () => {
            const result = xmlUtils.buildMessage(
                new UpdatePaymentMessage({
                    from: 'fromjid@domain',
                    to: 'tojid@domain',
                    message: new Message({
                        id: 'update-payment-message-uuid',
                        content: 'fedi:payment-request:',
                        payment: new Payment({
                            amount: 1000,
                            status: PaymentStatus.rejected,
                            updatedAt: Date.now() / 1000,
                        }),
                    }),
                }),
            )
            const fromAttr = result.getAttr('from')
            const toAttr = result.getAttr('to')
            const body = result.getChild('body')?.getText()

            expect(fromAttr).toEqual('fromjid@domain')
            expect(toAttr).toEqual('tojid@domain')
            expect(body).toEqual('fedi:payment-request:')
        })

        it('response contains the correct message ID', () => {
            const result = xmlUtils.buildMessage(
                new UpdatePaymentMessage({
                    from: 'fromjid@domain',
                    to: 'tojid@domain',
                    message: new Message({
                        id: 'update-payment-message-uuid',
                        content: 'fedi:payment-request:',
                        payment: new Payment({
                            amount: 1000,
                            status: PaymentStatus.rejected,
                            updatedAt: Date.now() / 1000,
                        }),
                    }),
                }),
            )
            const messageId = result.getAttr('id')

            expect(messageId).toContain('update-payment-message-uuid')
        })
    })
})
