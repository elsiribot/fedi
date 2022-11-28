class StringUtils {
    truncateMiddleOfString = (
        longString: string,
        numberOfCharacters: number,
    ): string => {
        // Nothing to truncate if string is not long enough
        if (longString.length <= numberOfCharacters * 2) {
            return longString
        }

        return `${longString.substring(
            0,
            numberOfCharacters,
        )} ... ${longString.slice(numberOfCharacters * -1)}`
    }
}

const stringUtils = new StringUtils()
export default stringUtils
