import { Btc, BtcString, MSats, MsatsString, Sats, SatsString } from '../types'

class AmountUtils {
    static BTC_MAX_DECIMAL_PLACES = 8
    static MIN_BTC_VALUE = 0.00000001
    static SATS_PER_BTC = 100000000
    static MSATS_PER_SAT = 1000

    msatToSat = (msats: MSats): Sats => {
        return Math.round(msats / AmountUtils.MSATS_PER_SAT)
    }
    satToMsat = (sats: Sats): MSats => {
        return sats * AmountUtils.MSATS_PER_SAT
    }
    satToBtc = (sats: Sats): Btc => {
        return Number(
            (sats / AmountUtils.SATS_PER_BTC).toFixed(
                AmountUtils.BTC_MAX_DECIMAL_PLACES,
            ),
        )
    }
    btcToSat = (btc: Btc): Sats => {
        return Number(
            (btc * AmountUtils.SATS_PER_BTC).toFixed(
                AmountUtils.BTC_MAX_DECIMAL_PLACES,
            ),
        )
    }
    btcToMsat = (btc: Btc): MSats => {
        const sats = this.btcToSat(btc)
        const msats = this.satToMsat(sats)
        return msats
    }
    msatToBtc = (msats: Sats): Btc => {
        const sats = this.msatToSat(msats)
        const btc = this.satToBtc(sats)
        return btc
    }

    msatToSatString = (msats: MSats): SatsString => {
        return this.msatToSat(msats).toFixed(0)
    }

    satToMsatString = (sats: Sats): MsatsString => {
        return this.satToMsat(sats).toFixed(0)
    }

    satToBtcString = (sats: Sats): BtcString => {
        return this.satToBtc(sats).toFixed(AmountUtils.BTC_MAX_DECIMAL_PLACES)
    }

    btcToSatString = (btc: Btc): SatsString => {
        return this.btcToSat(btc).toFixed(0)
    }
    btcToMsatString = (btc: Btc): MsatsString => {
        return this.btcToMsat(btc).toFixed(0)
    }
    msatToBtcString = (msats: MSats): BtcString => {
        const btc = this.msatToBtc(msats)
        return btc < AmountUtils.MIN_BTC_VALUE
            ? '0'
            : btc.toFixed(AmountUtils.BTC_MAX_DECIMAL_PLACES)
    }
}

const amountUtils = new AmountUtils()
export default amountUtils
