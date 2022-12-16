import stringUtils from './StringUtils'

describe('StringUtils', () => {
    describe('truncateMiddleOfString', () => {
        it('returns string with correct number of characters before ellipsis', () => {
            const truncateTwo = stringUtils
                .truncateMiddleOfString('aaaaa', 2)
                .indexOf(' ... ')
            const truncateSix = stringUtils
                .truncateMiddleOfString('aaaaabbbbbcccccddddd', 6)
                .indexOf(' ... ')

            expect(truncateTwo).toEqual(2)
            expect(truncateSix).toEqual(6)
        })
        it('returns string without truncation when not needed', () => {
            expect(stringUtils.truncateMiddleOfString('aaaabbbb', 8)).toEqual(
                'aaaabbbb',
            )
            expect(stringUtils.truncateMiddleOfString('aaaabbbb', 4)).toEqual(
                'aaaabbbb',
            )
        })
    })
})
