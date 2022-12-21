// TODO: use these types everywhere
// FIXME: if I pass Millis where I'm supposed to pass Sats, typescript doesn't complain

type Sats = number
type Millisats = number
type Btc = number

class AmountUtils {
    static BTC_MAX_DECIMAL_PLACES = 9
    static SATS_PER_BTC = 100000000
    static MSATS_PER_SAT = 1000
    // FIXME: this is a hack
    millisToSats = (millis: Millisats): Sats => {
        return Math.round(millis / AmountUtils.MSATS_PER_SAT)
    }
    satToMsat = (sats: Sats): Millisats => {
        return sats * AmountUtils.MSATS_PER_SAT
    }
    millisToBtc = (sats: Sats): Btc => {
        return Number(
            (
                sats /
                AmountUtils.SATS_PER_BTC /
                AmountUtils.MSATS_PER_SAT
            ).toFixed(8),
        )
    }
    satToBtc = (sats: Sats): Btc => {
        return Number(
            (sats / AmountUtils.SATS_PER_BTC).toFixed(
                AmountUtils.BTC_MAX_DECIMAL_PLACES,
            ),
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
