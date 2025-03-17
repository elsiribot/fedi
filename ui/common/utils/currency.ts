import { SupportedCurrency } from '../types'

// Gets the three-letter currency code from an entry in SupportedCurrency
export function getCurrencyCode(currency: SupportedCurrency): string {
    return currency.split('.')[0]
}
