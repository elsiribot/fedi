import xmlUtils from '../../utils/XmlUtils'

describe('XmlUtils', () => {
    describe('generateRoomConfigQueryXml', () => {
        it('response contains all of the provided values', () => {
            const result = xmlUtils.generateRoomConfigQueryXml(
                'a new room name',
                'fromjid@domain',
                'tojid@domain',
            )
            const stringified = result.toString()

            expect(stringified).toContain('a new room name')
            expect(stringified).toContain('fromjid')
            expect(stringified).toContain('tojid')
        })
        it('response contains the correct query ID', () => {
            const result = xmlUtils.generateRoomConfigQueryXml(
                'a new room name',
                'fromjid@domain',
                'tojid@domain',
            )
            const queryId = result.getAttr('id')

            expect(queryId).toContain('set-room-config')
        })
    })
})
