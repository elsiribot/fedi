export const truncateMiddleOfString = (longString: string): string => {
    return `${longString.substring(0, 14)} ... ${longString.slice(-14)}`
}
