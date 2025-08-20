import { TaggedError, UnexpectedError } from '../../utils/errors'
import { makeLog } from '../../utils/log'

const mockLog = {
    error: jest.fn(),
} as unknown as ReturnType<typeof makeLog>

describe('errors', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('TaggedError', () => {
        it('should create a tagged error with the correct tag and message', () => {
            const error = new TaggedError('GenericError').withMessage('test')

            expect(error._tag).toBe('GenericError')
            expect(error.message).toBe('test')
        })

        it('.logged(logFn) should log the error as a side effect', () => {
            const error = new TaggedError('LoggedError')
                .withMessage('test')
                .logged(mockLog)

            expect(mockLog.error).toHaveBeenCalledWith(
                `[${error._tag}]: ${error.message}`,
                error,
            )
        })

        it('.intoErr() / .intoErrAsync() should return the TaggedError wrapped in a neverthrow err() / errAsync()', async () => {
            const error = new TaggedError('GenericError')

            const neverthrowErr = error.intoErr()
            const neverthrowErrAsync = await error.intoErrAsync()

            expect(neverthrowErr.isErr()).toBe(true)
            expect(neverthrowErr._unsafeUnwrapErr()).toBe(error)
            expect(neverthrowErrAsync.isErr()).toBe(true)
            expect(neverthrowErrAsync._unsafeUnwrapErr()).toBe(error)
        })

        describe('tryInto', () => {
            it('should create a tagged error from a matching `Error` constructor', () => {
                const errorMessage = 'test'
                const error = new Error(errorMessage)
                const tryIntoFn = new TaggedError('GenericError').tryInto(Error)
                const taggedError = tryIntoFn(error)

                expect(taggedError._tag).toBe('GenericError')
                expect(taggedError.message).toBe(errorMessage)
            })

            it('should return an UnexpectedError if the passed-in value is not an instance of the constructor in tryInto()', () => {
                const errorMessage = 'test'
                const error = new Error(errorMessage)
                const tryIntoFn = new TaggedError('GenericError').tryInto(
                    TypeError,
                )
                // Error is not an instance of TypeError
                const unexpectedError = tryIntoFn(error)

                expect(unexpectedError._tag).toBe('UnexpectedError')
                expect(unexpectedError.message).toBe(
                    'Failed to construct GenericError from unknown value',
                )
            })

            it('should return an UnexpectedError if the passed-in value is already a tagged error', () => {
                const taggedError = new TaggedError('AlreadyTaggedError')
                const tryIntoFn = new TaggedError('ReTaggedError').tryInto(
                    Error,
                )
                const unexpectedError = tryIntoFn(taggedError)

                expect(unexpectedError._tag).toBe('UnexpectedError')
                expect(unexpectedError.message).toBe(
                    'Failed to construct ReTaggedError from AlreadyTaggedError',
                )
            })

            it('should return an UnexpectedError if the passed-in value is not an Error', () => {
                const tryIntoFn = new TaggedError('GenericError').tryInto(Error)
                const strErr = tryIntoFn('not an error')
                const numErr = tryIntoFn(1)
                const boolErr = tryIntoFn(true)
                const nullErr = tryIntoFn(null)
                const undefinedErr = tryIntoFn(undefined)

                expect(strErr._tag).toBe('UnexpectedError')
                expect(numErr._tag).toBe('UnexpectedError')
                expect(boolErr._tag).toBe('UnexpectedError')
                expect(nullErr._tag).toBe('UnexpectedError')
                expect(undefinedErr._tag).toBe('UnexpectedError')
            })
        })
    })

    describe('UnexpectedError', () => {
        it('should initialize with the correct tag and message', () => {
            const unexpectedError = new UnexpectedError(
                new Error('test'),
                'GenericError',
            )

            expect(unexpectedError._tag).toBe('UnexpectedError')
            expect(unexpectedError.message).toBe(
                'Failed to construct GenericError from unknown value',
            )
        })

        it('should display the attempted tag if the passed-in value is already a tagged error', () => {
            const taggedError = new TaggedError('GenericError')
            const unexpectedError = new UnexpectedError(
                taggedError,
                'DifferentError',
            )

            expect(unexpectedError._tag).toBe('UnexpectedError')
            expect(unexpectedError.message).toBe(
                'Failed to construct DifferentError from GenericError',
            )
        })
    })
})
