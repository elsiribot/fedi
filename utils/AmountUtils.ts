// TODO: use these types everywhere
// FIXME: if I pass Millis where I'm supposed to pass Sats, typescript doesn't complain

type Sats = number
type Millisats = number
type Btc = number

class AmountUtils {
    static BTC_MAX_DECIMAL_PLACES = 8
    static SATS_PER_BTC = 100000000
    static MSATS_PER_SAT = 1000
    // FIXME: this is a hack
    millisToSats = (millis: Millisats): Sats => {
        return Math.round(millis / AmountUtils.MSATS_PER_SAT)
    }
    satToMsat = (sats: Sats): Millisats => {
        return sats * AmountUtils.MSATS_PER_SAT
    }
    millisToBtc = (msats: Sats): Btc => {
        const toSats = this.millisToSats(msats).toFixed(
            AmountUtils.BTC_MAX_DECIMAL_PLACES,
        )
        const toBtc = this.satToBtc(Number(toSats))
        return toBtc
    }
    btcToSat = (btc: Btc): Btc => {
        return Number(
            (btc * AmountUtils.SATS_PER_BTC).toFixed(
                AmountUtils.BTC_MAX_DECIMAL_PLACES,
            ),
        )
    }
    satToBtc = (sats: Sats): Btc => {
        return Number(
            (sats / AmountUtils.SATS_PER_BTC).toFixed(
                AmountUtils.BTC_MAX_DECIMAL_PLACES,
            ),
        )
    }
    millisToBtcString = (msats: Sats): string => {
        const toSats = this.millisToSats(msats).toFixed(
            AmountUtils.BTC_MAX_DECIMAL_PLACES,
        )
        const toBtc = this.satToBtcString(Number(toSats))
        return toBtc
    }
    satToBtcString = (sats: Sats): string => {
        return (sats / AmountUtils.SATS_PER_BTC).toFixed(
            AmountUtils.BTC_MAX_DECIMAL_PLACES,
        )
    }
    stringToMillis = (number: string): number => {
        return parseInt(number, 10) * 1000
    }
    stringToSats = (number: string): number => {
        return parseInt(number, 10)
    }
}

const amountUtils = new AmountUtils()
export default amountUtils
