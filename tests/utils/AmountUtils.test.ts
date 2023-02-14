// @ts-nocheck
// For simplicity's sake we ignore type-checking here to protect
// readability since each test already describes which type of
// units are involved
import amountUtils from '../../utils/AmountUtils'

describe('AmountUtils', () => {
    describe('msatToSat', () => {
        it('should convert millisats to sats', () => {
            const result = amountUtils.msatToSat(10000)

            expect(result).toEqual(10)
        })
        it('should convert millisats to sats and round down', () => {
            const result = amountUtils.msatToSat(12345)

            expect(result).toEqual(12)
        })
        it('should convert millisats to sats and still round down', () => {
            const result = amountUtils.msatToSat(98765)

            expect(result).toEqual(98)
        })
    })
    describe('satToMsat', () => {
        it('should convert sats to millisats', () => {
            const result = amountUtils.satToMsat(10)

            expect(result).toEqual(10000)
        })
    })
    describe('satToBtc', () => {
        it('should convert sats to bitcoins', () => {
            const result = amountUtils.satToBtc(10)

            expect(result).toEqual(0.0000001)
        })
    })
    describe('btcToSat', () => {
        it('should convert bitcoins to sats', () => {
            const result = amountUtils.btcToSat(10)

            expect(result).toEqual(1000000000)
        })
        it('should convert a fraction of a bitcoin to sats', () => {
            const result = amountUtils.btcToSat(0.01)

            expect(result).toEqual(1000000)
        })
    })
    describe('btcToMsat', () => {
        it('should convert bitcoins to millisats', () => {
            const result = amountUtils.btcToMsat(10)

            expect(result).toEqual(1000000000000)
        })
        it('should convert 0 bitcoins to 0 millisats', () => {
            const result = amountUtils.btcToMsat(0)

            expect(result).toEqual(0)
        })
        it('should convert a fraction of a bitcoin to millisats', () => {
            const result = amountUtils.btcToMsat(0.01)

            expect(result).toEqual(1000000000)
        })
    })
    describe('msatToBtc', () => {
        it('should convert 10 millisats to 0 bitcoins (rounded down)', () => {
            const result = amountUtils.msatToBtc(10)

            expect(result).toEqual(0)
        })
        it('should convert 100 millisats to 0 bitcoins (rounded down)', () => {
            const result = amountUtils.msatToBtc(100)

            expect(result).toEqual(0)
        })
        it('should convert 1000 millisats to 0.00000001 bitcoin', () => {
            const result = amountUtils.msatToBtc(1000)

            expect(result).toEqual(0.00000001)
        })
        it('should convert 10K millisats to bitcoins', () => {
            const result = amountUtils.msatToBtc(10000)

            expect(result).toEqual(0.0000001)
        })
        it('should convert 1M millisats to bitcoins', () => {
            const result = amountUtils.msatToBtc(1000000)

            expect(result).toEqual(0.00001)
        })
    })
    describe('msatToSatString', () => {
        it('should convert millisats to sats', () => {
            const result = amountUtils.msatToSatString(10000)

            expect(result).toEqual('10')
        })
        it('should convert millisats to sats and round down', () => {
            const result = amountUtils.msatToSatString(12345)

            expect(result).toEqual('12')
        })
        it('should convert millisats to sats and still round down', () => {
            const result = amountUtils.msatToSatString(98765)

            expect(result).toEqual('98')
        })
    })
    describe('satToMsatString', () => {
        it('should convert sats to millisats', () => {
            const result = amountUtils.satToMsatString(10)

            expect(result).toEqual('10000')
        })
    })
    describe('satToBtcString', () => {
        it('should convert 1 sats to bitcoins', () => {
            const result = amountUtils.satToBtcString(1)

            expect(result).toEqual('0.00000001')
        })
        it('should convert 10 sats to bitcoins with 1 trailing zero', () => {
            const result = amountUtils.satToBtcString(10)

            expect(result).toEqual('0.00000010')
        })
        it('should convert 10M sats to bitcoins with all trailing zeros', () => {
            const result = amountUtils.satToBtcString(10000000)

            expect(result).toEqual('0.10000000')
        })
    })
    describe('btcToSatString', () => {
        it('should convert bitcoins to sats', () => {
            const result = amountUtils.btcToSatString(10)

            expect(result).toEqual('1000000000')
        })
        it('should convert a fraction of a bitcoin to sats', () => {
            const result = amountUtils.btcToSatString(0.01)

            expect(result).toEqual('1000000')
        })
    })
    describe('btcToMsatString', () => {
        it('should convert bitcoins to millisats', () => {
            const result = amountUtils.btcToMsatString(10)

            expect(result).toEqual('1000000000000')
        })
        it('should convert 0 bitcoins to 0 millisats', () => {
            const result = amountUtils.btcToMsatString(0)

            expect(result).toEqual('0')
        })
        it('should convert a fraction of a bitcoin to millisats', () => {
            const result = amountUtils.btcToMsatString(0.01)

            expect(result).toEqual('1000000000')
        })
    })
    describe('msatToBtcString', () => {
        it('should convert 10 millisats to 0 bitcoins (rounded down)', () => {
            const result = amountUtils.msatToBtcString(10)
            console.log(typeof result)

            expect(result).toEqual('0')
        })
        it('should convert 100 millisats to 0 bitcoins (rounded down)', () => {
            const result = amountUtils.msatToBtcString(100)

            expect(result).toEqual('0')
        })
        it('should convert 1000 millisats to 0.00000001 bitcoin', () => {
            const result = amountUtils.msatToBtcString(1000)

            expect(result).toEqual('0.00000001')
        })
        it('should convert 1M millisats to bitcoins', () => {
            const result = amountUtils.msatToBtcString(1000000)

            expect(result).toEqual('0.00001000')
        })
    })
})
