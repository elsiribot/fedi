/**
 * Attempts to turn an unknown error object into a user-readable message.
 * The message can either be plaintext, or a translation key which will
 * be translated.
 */
export function formatErrorMessage(
    t: (msg: string, defaultMsg: string) => string,
    err: unknown,
    defaultMessage: string,
) {
    if (!err) return t(defaultMessage, defaultMessage)
    if (typeof err === 'string') {
        return t(err, err)
    }
    if (
        typeof err === 'object' &&
        'message' in err &&
        typeof err.message === 'string'
    ) {
        return t(err.message, err.message)
    }
    return defaultMessage
}
