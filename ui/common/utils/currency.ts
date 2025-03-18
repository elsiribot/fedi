import { SupportedCurrency } from '../types'

// Gets the three-letter currency code from an entry in SupportedCurrency
export function getCurrencyCode(
    currency: SupportedCurrency,
): string & { length: 3 } {
    return currency.split('.')[0] as string & { length: 3 }
}
