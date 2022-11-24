export const truncateMiddleOfString = (
    longString: string,
    numberOfCharacters: number,
): string => {
    return `${longString.substring(
        0,
        numberOfCharacters,
    )} ... ${longString.slice(numberOfCharacters * -1)}`
}
