import StringUtils from './StringUtils'

describe('StringUtils', () => {
    describe('truncateMiddleOfString', () => {
        it('returns string with correct number of characters before ellipsis', () => {
            const truncateTwo = StringUtils.truncateMiddleOfString(
                'aaaaa',
                2,
            ).indexOf(' ... ')
            const truncateSix = StringUtils.truncateMiddleOfString(
                'aaaaabbbbbcccccddddd',
                6,
            ).indexOf(' ... ')

            expect(truncateTwo).toEqual(2)
            expect(truncateSix).toEqual(6)
        })
        it('returns string without truncation when not needed', () => {
            expect(StringUtils.truncateMiddleOfString('aaaabbbb', 8)).toEqual(
                'aaaabbbb',
            )
            expect(StringUtils.truncateMiddleOfString('aaaabbbb', 4)).toEqual(
                'aaaabbbb',
            )
        })
    })
})
