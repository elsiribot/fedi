import accounting from 'accounting-js'
import { Btc, BtcString, MSats, MsatsString, Sats, SatsString } from '../types'

class AmountUtils {
    static BTC_MAX_DECIMAL_PLACES = 8
    static MIN_BTC_VALUE = 0.00000001
    static SATS_PER_BTC = 100000000
    static MSATS_PER_SAT = 1000

    msatToSat = (msats: MSats): Sats => {
        return Math.round(msats / AmountUtils.MSATS_PER_SAT) as Sats
    }
    satToMsat = (sats: Sats): MSats => {
        return (sats * AmountUtils.MSATS_PER_SAT) as MSats
    }
    satToBtc = (sats: Sats): Btc => {
        return Number(
            (sats / AmountUtils.SATS_PER_BTC).toFixed(
                AmountUtils.BTC_MAX_DECIMAL_PLACES,
            ),
        ) as Btc
    }
    btcToSat = (btc: Btc): Sats => {
        return Number(
            (btc * AmountUtils.SATS_PER_BTC).toFixed(
                AmountUtils.BTC_MAX_DECIMAL_PLACES,
            ),
        ) as Sats
    }
    btcToMsat = (btc: Btc): MSats => {
        const sats = this.btcToSat(btc)
        const msats = this.satToMsat(sats)
        return msats
    }
    msatToBtc = (msats: MSats): Btc => {
        const sats = this.msatToSat(msats)
        const btc = this.satToBtc(sats)
        return btc
    }

    msatToSatString = (msats: MSats): SatsString => {
        return this.msatToSat(msats).toFixed(0) as SatsString
    }

    satToMsatString = (sats: Sats): MsatsString => {
        return this.satToMsat(sats).toFixed(0) as MsatsString
    }

    satToBtcString = (sats: Sats): BtcString => {
        return this.satToBtc(sats).toFixed(
            AmountUtils.BTC_MAX_DECIMAL_PLACES,
        ) as BtcString
    }

    btcToSatString = (btc: Btc): SatsString => {
        return this.btcToSat(btc).toFixed(0) as SatsString
    }
    btcToMsatString = (btc: Btc): MsatsString => {
        return this.btcToMsat(btc).toFixed(0) as MsatsString
    }
    msatToBtcString = (msats: MSats): BtcString => {
        const btc = this.msatToBtc(msats)
        return (
            btc < AmountUtils.MIN_BTC_VALUE
                ? '0'
                : btc.toFixed(AmountUtils.BTC_MAX_DECIMAL_PLACES)
        ) as BtcString
    }
    formatNumber = (amount: Number) => {
        return accounting.formatNumber(amount, { precision: 0 })
    }
}

const amountUtils = new AmountUtils()
export default amountUtils
