import fetchMock from 'jest-fetch-mock'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { z } from 'zod'

import {
    constructUrl,
    fetchResult,
    thenJson,
    throughZodSchema,
} from '../../utils/neverthrow'

fetchMock.enableMocks()

const validDataUrl = 'https://validjson.com'
const responseHtmlUrl = 'https://html.com'
const invalidUrl = '$invalid\\url'

const testSchema = z.object({
    foo: z.string(),
    baz: z.number(),
})

const sampleValidData = { foo: 'bar', baz: 1 }
const sampleInvalidData = { foo: 1, baz: 'qux' }

describe('fedimods', () => {
    // --- Mock API for LNURLs ---
    const server = setupServer(
        rest.get(validDataUrl, (_req, res, ctx) => {
            return res(
                ctx.status(200),
                ctx.set('Content-Type', 'application/json'),
                ctx.body(JSON.stringify(sampleValidData)),
            )
        }),
        rest.get(responseHtmlUrl, (_req, res, ctx) => {
            return res(
                ctx.status(200),
                ctx.set('Content-Type', 'text/html'),
                ctx.body('<html>hi</html>'),
            )
        }),
    )

    beforeEach(() => server.listen())
    afterEach(() => server.resetHandlers())
    afterAll(() => server.close())

    describe('constructUrl', () => {
        it('should return an Ok() for a valid URL', () => {
            const url = constructUrl('https://example.com')

            expect(url.isOk()).toBe(true)
            expect(url.isErr()).toBe(false)
        })

        it('should return an Err() for an invalid URL', () => {
            const url = constructUrl(invalidUrl)

            expect(url.isOk()).toBe(false)
            expect(url.isErr()).toBe(true)
        })
    })

    describe('throughZodSchema', () => {
        it('should return an Ok() for valid data', () => {
            const parser = throughZodSchema(testSchema)
            const result = parser(sampleValidData)

            expect(result.isOk()).toBe(true)
            expect(result.isErr()).toBe(false)
        })

        it('should return an Err() for invalid data', () => {
            const parser = throughZodSchema(testSchema)
            const result = parser(sampleInvalidData)

            expect(result.isOk()).toBe(false)
            expect(result.isErr()).toBe(true)
        })
    })

    describe('fetchResult', () => {
        it('should return an Ok() if the fetch is successful', async () => {
            const result = await fetchResult(validDataUrl)

            expect(result.isOk()).toBe(true)
            expect(result.isErr()).toBe(false)
        })

        it('should return an Err() if the fetch fails', async () => {
            const result = await fetchResult(invalidUrl)

            expect(result.isOk()).toBe(false)
            expect(result.isErr()).toBe(true)
        })
    })

    describe('thenJson', () => {
        it('should return an Ok() if the response is successfully parsed as JSON', async () => {
            const result = await fetchResult(validDataUrl).andThen(thenJson)

            expect(result.isOk()).toBe(true)
            expect(result.isErr()).toBe(false)
            expect(result.unwrapOr(null)).toEqual(sampleValidData)
        })

        it('should return an Err() if the response fails to be parsed as JSON', async () => {
            const result = await fetchResult(responseHtmlUrl).andThen(thenJson)

            expect(result.isOk()).toBe(false)
            expect(result.isErr()).toBe(true)
            expect(result.unwrapOr(null)).toBe(null)
        })
    })

    describe('piping', () => {
        it('should successfully pipe an http response through thenJson and through a zod schema', async () => {
            const result = await fetchResult(validDataUrl)
                .andThen(thenJson)
                .andThen(throughZodSchema(testSchema))

            expect(result.isOk()).toBe(true)
            expect(result.isErr()).toBe(false)
            expect(result.unwrapOr(null)).toEqual(sampleValidData)
        })
    })
})
