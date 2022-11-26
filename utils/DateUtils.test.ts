import DateUtils from './DateUtils'

describe('DateUtils', () => {
    describe('formatTimestamp', () => {
        it('should use default format yyyy-MM-dd is used if dateFormat not provided', () => {
            const formatted = DateUtils.formatTimestamp(1231006505)

            expect(formatted).toEqual('2009-01-03')
        })
        it('should throw an error if millisconds are used', () => {
            expect(() => {
                DateUtils.formatTimestamp(1231006505000)
            }).toThrowError()
        })
    })
})
