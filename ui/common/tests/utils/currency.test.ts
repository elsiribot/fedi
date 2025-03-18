import { SupportedCurrency } from '../../types'
import { getCurrencyCode } from '../../utils/currency'

describe('currency', () => {
    describe('getCurrencyCode', () => {
        it('correctly returns a three-letter currency code', () => {
            expect(getCurrencyCode(SupportedCurrency.USD)).toBe('USD')
        })

        it('correctly returns the first half of a generic currency code', () => {
            expect(getCurrencyCode(SupportedCurrency.MALI)).toBe('XOF')
        })

        it('confirms that all supported currencies return three-letter codes', () => {
            for (const currency of Object.values(SupportedCurrency)) {
                expect(getCurrencyCode(currency)).toHaveLength(3)
            }
        })
    })
})
