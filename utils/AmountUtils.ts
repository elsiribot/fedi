// TODO: use these types everywhere
// FIXME: if I pass Millis where I'm supposed to pass Sats, typescript doesn't complain

type Sats = number
type Millisats = number

class AmountUtils {
    // FIXME: this is a hack
    millisToSats = (millis: Millisats): Sats => {
        return Math.round(millis / 1000)
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
