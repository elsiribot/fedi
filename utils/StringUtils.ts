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
    keepOnlyLowercaseLetters = (value: string): string => {
        // Remove all characters except for lowercase letters
        const seedWordValue = value.replace(/[^a-z]/g, '')

        return seedWordValue
    }
}

const stringUtils = new StringUtils()
export default stringUtils
