import xmlUtils from '../../utils/XmlUtils'

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

            expect(queryId).toContain('set-room-config')
        })
    })
})
