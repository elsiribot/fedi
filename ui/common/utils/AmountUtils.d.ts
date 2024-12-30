import { AmountSymbolPosition } from '../hooks/amount';
import { Btc, BtcString, MSats, MsatsString, Sats, SatsString, SupportedCurrency, Usd, UsdCents, UsdString } from '../types';
declare class AmountUtils {
    static BTC_MAX_DECIMAL_PLACES: number;
    static MIN_BTC_VALUE: number;
    static SATS_PER_BTC: number;
    static MSATS_PER_SAT: number;
    static FIAT_MAX_DECIMAL_PLACES: number;
    msatToFiat: (msats: MSats, rate: number) => Usd;
    satToFiat: (sats: Sats, rate: number) => Usd;
    btcToFiat: (btc: Btc, rate: number) => Usd;
    msatToFiatString: (msats: MSats, rate: number) => UsdString;
    satToFiatString: (sats: Sats, rate: number) => UsdString;
    btcToFiatString: (btc: Btc, rate: number) => UsdString;
    msatToSat: (msats: MSats) => Sats;
    satToMsat: (sats: Sats) => MSats;
    satToBtc: (sats: Sats) => Btc;
    btcToSat: (btc: Btc) => Sats;
    btcToMsat: (btc: Btc) => MSats;
    msatToBtc: (msats: MSats) => Btc;
    fiatToMsat: (fiat: number, rate: number) => MSats;
    fiatToSat: (fiat: number, rate: number) => Sats;
    fiatToBtc: (fiat: number, rate: number) => Btc;
    msatToSatString: (msats: MSats) => SatsString;
    satToMsatString: (sats: Sats) => MsatsString;
    satToBtcString: (sats: Sats) => BtcString;
    btcToSatString: (btc: Btc) => SatsString;
    btcToMsatString: (btc: Btc) => MsatsString;
    msatToBtcString: (msats: MSats) => BtcString;
    formatNumber: (amount: number) => string;
    formatSats: (sats: Sats) => string;
    /**
     * Given a fiat currency amount and the ISO code of the currency,
     * return a string formatted in the user's default locale of the
     * amount. Use symbolPosition to move or hide the currency code
     */
    formatFiat: (amount: number, currency: SupportedCurrency, options?: {
        locale?: string | string[];
        symbolPosition?: AmountSymbolPosition;
    }) => string;
    /**
     * Given a currency, return a symbol for it in the user's default locale.
     */
    getCurrencySymbol: (currency: SupportedCurrency, options?: {
        locale?: string | string[];
    }) => string;
    /**
     * Given a currency, return the number of decimals (significant digits)
     * that is standard for that currency.
     * If undefined, return 0.
     */
    getCurrencyDecimals: (currency: SupportedCurrency, options?: {
        locale?: string | string[];
    }) => number;
    /**
     * Returns the thousands separator character for the user's default locale.
     */
    getThousandsSeparator: (options?: {
        locale?: string | string[];
    }) => string;
    /**
     * Returns the decimal separator character for the user's default locale.
     */
    getDecimalSeparator: (options?: {
        locale?: string | string[];
    }) => string;
    /**
     * Given a string amount that is formatted in the user's default locale,
     * parse a floating point number from it. Handles removing symbols too.
     */
    parseFiatString: (fiat: string, options?: {
        locale?: string | string[];
    }) => number;
    /**
     * Given a number amount in USD cents, convert to a any other fiat
     * currency with the 2 exchange rates
     */
    convertCentsToOtherFiat: (cents: UsdCents, btcUsdRate: number, btcFiatRate: number) => number;
}
declare const amountUtils: AmountUtils;
export default amountUtils;
