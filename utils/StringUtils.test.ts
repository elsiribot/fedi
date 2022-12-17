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
        it('strips out all whitepspaces', () => {
            expect(stringUtils.keepOnlyLowercaseLetters(' a b c d e ')).toEqual(
                'abcde',
            )
        })
        it('strips out capital letters and whitespaces', () => {
            expect(stringUtils.keepOnlyLowercaseLetters('a B c D e')).toEqual(
                'ace',
            )
        })
        it('strips out special characters and whitespaces', () => {
            expect(stringUtils.keepOnlyLowercaseLetters('a ! @ # e')).toEqual(
                'ae',
            )
        })
    })
})
