import accounting from 'accounting'
import {
    Btc,
    BtcString,
    MSats,
    MsatsString,
    Sats,
    SatsString,
    Usd,
    UsdString,
} from '../types'

class AmountUtils {
    static BTC_MAX_DECIMAL_PLACES = 8
    static MIN_BTC_VALUE = 0.00000001
    static SATS_PER_BTC = 100000000
    static MSATS_PER_SAT = 1000
    static USD_MAX_DECIMAL_PLACES = 2

    // For BTC unit conversions returned as number
    msatToUsd = (msats: MSats, rate: number): Usd => {
        const btc = this.msatToBtc(msats)
        return this.btcToUsd(btc, rate)
    }
    satToUsd = (sats: Sats, rate: number): Usd => {
        const btc = this.satToBtc(sats)
        return this.btcToUsd(btc, rate)
    }
    btcToUsd = (btc: Btc, rate: number): Usd => {
        return Number(
            (btc * rate).toFixed(AmountUtils.USD_MAX_DECIMAL_PLACES),
        ) as Usd
    }
    msatToUsdString = (msats: MSats, rate: number): UsdString => {
        const btc = this.msatToBtc(msats)
        return this.btcToUsdString(btc, rate)
    }
    satToUsdString = (sats: Sats, rate: number): UsdString => {
        const btc = this.satToBtc(sats)
        return this.btcToUsdString(btc, rate)
    }
    btcToUsdString = (btc: Btc, rate: number): UsdString => {
        return this.btcToUsd(btc, rate).toFixed(
            AmountUtils.USD_MAX_DECIMAL_PLACES,
        ) as UsdString
    }

    // For BTC unit conversions returned as number
    msatToSat = (msats: MSats): Sats => {
        // Round down so that we never say the user has more than they have,
        // which could cause "wallet sweep" to fail
        return Math.floor(msats / AmountUtils.MSATS_PER_SAT) as Sats
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

    // For BTC unit conversions returned as strings
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
    formatNumber = (amount: number): string => {
        return accounting.formatNumber(amount, { precision: 0 })
    }
}

const amountUtils = new AmountUtils()
export default amountUtils
