import format from 'date-fns/format'
import fromUnixTime from 'date-fns/fromUnixTime'

class DateUtils {
    static DEFAULT_FORMAT = 'yyyy-MM-dd'

    formatTimestamp = (
        unixSeconds: number,
        dateFormat: string = DateUtils.DEFAULT_FORMAT,
    ): string => {
        // it is safe to use 13+ characters to detect milliseconds
        // because timestamps should never be older than 2001
        // https://stackoverflow.com/questions/23929145/how-to-test-if-a-given-time-stamp-is-in-seconds-or-milliseconds
        if (unixSeconds.toString().length >= 13) {
            throw new Error('unixSeconds must be in seconds not ms')
        }
        const timestamp = fromUnixTime(unixSeconds)
        return format(timestamp, dateFormat)
    }
}

const dateUtils = new DateUtils()
export default dateUtils
