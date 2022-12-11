// TODO: use these types everywhere
type Sats = number
type Millisats = number

class AmountUtils {
    // FIXME: this is a hack
    toSats = (millis: Millisats): Sats => {
        return Math.round(millis / 1000)
    }
}

const amountUtils = new AmountUtils()
export default amountUtils
