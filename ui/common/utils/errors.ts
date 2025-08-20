import { err, errAsync } from 'neverthrow'

import { ErrorCode, RpcError } from '../types/bindings'
import { makeLog } from './log'

type ErrString = `${string}Error`

abstract class CustomError extends Error {
    public abstract _tag: ErrString

    /**
     * Chainable method that logs the error instance with the provided `logFunction` as a side effect
     */
    public logged(logFunction: ReturnType<typeof makeLog>) {
        logFunction.error(`[${this._tag}]: ${this.message}`, this)

        return this
    }

    /** Wraps the error instance in a `neverthrow` `err()` */
    public intoErr() {
        return err(this)
    }

    /** Wraps the error instance in a `neverthrow` `errAsync()` */
    public intoErrAsync() {
        return errAsync(this)
    }
}

/**
 * Specific error type used when a fedimint bridge rpc call fails
 */
export class BridgeError extends CustomError {
    public _tag = 'BridgeError' as const
    public detail: string
    public error: string
    public errorCode: ErrorCode | null

    constructor(json: RpcError) {
        super(`BridgeError: ${json.error}`)
        this.error = json.error
        this.errorCode = json.errorCode
        this.detail = json.detail
    }

    static tryFrom(e: unknown): BridgeError | UnexpectedError {
        if (e instanceof BridgeError) return e

        return new UnexpectedError(e, 'BridgeError')
    }
}

export class TaggedError<T extends ErrString> extends CustomError {
    public _tag: T

    constructor(tag: T) {
        super(tag)

        this._tag = tag
    }

    /**
     * Tries to convert an unknown value into a `TaggedError` instance
     * If the unknown value cannot be converted, returns an `UnexpectedError`
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public tryInto<E extends new (...args: any[]) => any>(
        constructor: E,
    ): (e: unknown) => TaggedError<T> | UnexpectedError {
        return (e: unknown) => {
            if (e instanceof constructor && !('_tag' in e)) {
                // Serializes `e` into a plain object to be used in `Object.assign`
                const serializedError =
                    // `getOwnPropertyNames` works similar to `Object.keys` but returns both enumerable and non-enumerable properties
                    // `Error.message`, `Error.stack`, etc are non-enumerable properties and are not included in `Object.keys`, `Object.entries`, `JSON.stringify`, etc
                    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Enumerability_and_ownership_of_properties
                    Object.getOwnPropertyNames(e).reduce((acc, prop) => {
                        acc[prop] = e[prop]
                        return acc
                    }, {} as InstanceType<E>)

                // Mutates the `this` object to include the properties of the serialized error
                // Using `Object.assign(this, e)` will NOT work because `Error.message`, `Error.stack`, etc are non-enumerable properties
                return Object.assign(this, serializedError)
            }

            return new UnexpectedError(e, this._tag)
        }
    }

    /**
     * Chainable method that adds a message to the `TaggedError` instance
     */
    public withMessage(message: string) {
        this.message = message

        return this
    }
}

/**
 * Specific error type used when a TaggedError fails to be be constructed from an unknown value
 */
export class UnexpectedError extends CustomError {
    public _tag = 'UnexpectedError' as const
    unexpectedError: unknown

    constructor(_unexpectedError: unknown, attemptedTag: string) {
        let unknownValue = 'unknown value'

        // If the unexpected error is a result of an already-tagged error,
        // display the original error tag instead of 'unknown value'
        if (
            _unexpectedError instanceof Error &&
            '_tag' in _unexpectedError &&
            typeof _unexpectedError._tag === 'string'
        ) {
            unknownValue = _unexpectedError._tag
        }

        super(`Failed to construct ${attemptedTag} from ${unknownValue}`)
        this.unexpectedError = _unexpectedError
    }
}
