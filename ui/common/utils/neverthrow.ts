import { ok, Result, ResultAsync } from 'neverthrow'
import { ZodError, ZodSchema, z } from 'zod'

import { TaggedError, UnexpectedError } from './errors'

/**
 * Attempts to pass unknown data through a zod schema
 * If parsing fails, bubbles up a `MalformedDataError`
 * Otherwise, casts the result to the inferred type of the schema
 *
 * @example
 * ```typescript
 * const zodSchema = z.object({ foo: z.string() })
 * const result: Result<unknown, Error> = ...
 *
 * result
 *   .andThen(throughSchema(zodSchema))
 * ```
 */
export const throughZodSchema = <T extends ZodSchema>(schema: T) => {
    const parse = (data: unknown): z.infer<T> => schema.parse(data)
    return Result.fromThrowable(
        parse,
        new TaggedError('SchemaValidationError').tryInto(ZodError),
    )
}

/**
 * Attempts to perform a safe `fetch()` call
 * If an invalid URL is passed, bubbles up a `UrlConstructError`
 * If the fetch fails, bubbles up a `FetchError`
 * A non-ok status code does **not** result in a `FetchError`
 */
export const fetchResult = (
    ...args: Parameters<typeof fetch>
): ResultAsync<
    Response,
    | TaggedError<'UrlConstructError'>
    | TaggedError<'FetchError'>
    | UnexpectedError
> =>
    ResultAsync.fromPromise(fetch(...args), e => {
        if (e instanceof Error && e.message.includes('URL')) {
            return new TaggedError('UrlConstructError').tryInto(Error)(e)
        }

        return new TaggedError('FetchError').tryInto(Error)(e)
    })

/**
 * Attempts to parse a `Response` as JSON
 * If parsing fails, bubbles up a `MalformedDataError`
 *
 * @example
 * ```typescript
 * await fetchResult(lnurl)
 *   .andThen(thenJson)
 * ```
 */
export const thenJson = (
    res: Response,
): ResultAsync<unknown, TaggedError<'MalformedDataError'> | UnexpectedError> =>
    ResultAsync.fromPromise(
        res.json(),
        new TaggedError('MalformedDataError').tryInto(Error),
    )

/**
 * Attempts to construct a `URL` from a string or a `URL` object
 * If an invalid URL is passed, bubbles up a `UrlConstructError`
 */
export const constructUrl = Result.fromThrowable(
    (...args: ConstructorParameters<typeof URL>) => new URL(...args),
    new TaggedError('UrlConstructError').tryInto(Error),
)

/**
 * Ensures that a value is not null or undefined
 * If the value is null or undefined, returns a `MissingDataError`
 *
 * @example
 * ```typescript
 * result
 *   .andThen(ensureNonNullish)
 *   .andThen(value => {
 *     // value is not null or undefined
 *   })
 * ```
 */
export const ensureNonNullish = <T>(
    value: T,
): Result<NonNullable<T>, TaggedError<'MissingDataError'>> => {
    if (value === null || value === undefined)
        return new TaggedError('MissingDataError')
            .withMessage(`Expected non-nullish value, got ${value}`)
            .intoErr()

    return ok(value as NonNullable<T>)
}
