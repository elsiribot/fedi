import { rest } from 'msw'
import { setupServer } from 'msw/node'

import { GITHUB_RELEASES_API_URL } from '../../../constants/release'
import {
    ReleaseAsset,
    ReleaseJson,
    tryFetchReleaseNotes,
    tryFetchReleaseSchema,
} from '../../../utils/release'

const validAssetJson: ReleaseAsset = {
    name: 'release-notes.json',
    browser_download_url: 'https://github.com/release-notes.json',
}

const validReleaseJson: ReleaseJson = {
    id: 123456,
    tag_name: '26.0.0',
    assets: [validAssetJson],
}

const validReleaseNotesJson = {
    en: 'release notes',
    es: 'notas de la versión',
}

const invalidReleaseNotesJson = {
    es: 12344,
    en: { type: 'string' },
}

const notNotesAssetJson: ReleaseAsset = {
    name: 'readme.md',
    browser_download_url: 'https://github.com/readme.md',
}

const invalidReleaseJson = {
    id: 'none',
    assets: 'invalid assets',
    tag: 3,
}

describe('tryFetchReleaseSchema', () => {
    const server = setupServer(
        rest.get(GITHUB_RELEASES_API_URL, (_req, res, ctx) => {
            return res(
                ctx.status(200),
                ctx.set('Content-Type', 'application/json'),
                ctx.body(JSON.stringify(validReleaseJson)),
            )
        }),
    )

    beforeEach(() => server.listen())
    afterEach(() => server.resetHandlers())
    afterAll(() => server.close())

    it('should return a release schema', async () => {
        const result = await tryFetchReleaseSchema()

        expect(result).toEqual(validReleaseJson)
    })

    it('should throw if the fetch fails', async () => {
        server.use(
            rest.get(GITHUB_RELEASES_API_URL, (_req, res) => {
                return res.networkError('getaddrinfo ENOTFOUND')
            }),
        )

        const result = tryFetchReleaseSchema()

        expect(result).rejects.toThrow()
    })

    it('should throw if a non-JSON response is received', async () => {
        server.use(
            rest.get(GITHUB_RELEASES_API_URL, (_req, res, ctx) => {
                return res(
                    ctx.status(200),
                    ctx.set('Content-Type', 'text/html'),
                    ctx.body('<html>hi</html>'),
                )
            }),
        )

        const result = tryFetchReleaseSchema()

        expect(result).rejects.toThrow()
    })

    it('should throw if the response does not match the schema', async () => {
        server.use(
            rest.get(GITHUB_RELEASES_API_URL, (_req, res, ctx) => {
                return res(
                    ctx.status(200),
                    ctx.set('Content-Type', 'application/json'),
                    ctx.body(JSON.stringify(invalidReleaseJson)),
                )
            }),
        )

        const result = tryFetchReleaseSchema()

        expect(result).rejects.toThrow()
    })
})

describe('tryFetchReleaseNotes', () => {
    const server = setupServer(
        rest.get(GITHUB_RELEASES_API_URL, (_req, res, ctx) => {
            return res(
                ctx.status(200),
                ctx.set('Content-Type', 'application/json'),
                ctx.body(JSON.stringify(validReleaseJson)),
            )
        }),
        rest.get(validAssetJson.browser_download_url, (_req, res, ctx) => {
            return res(
                ctx.status(200),
                ctx.set('Content-Type', 'application/json'),
                ctx.body(JSON.stringify(validReleaseNotesJson)),
            )
        }),
    )

    beforeEach(() => server.listen())
    afterEach(() => server.resetHandlers())
    afterAll(() => server.close())

    it('should fetch and return the release notes', async () => {
        const result = await tryFetchReleaseNotes(validReleaseJson)

        expect(result).toEqual(validReleaseNotesJson)
    })

    it('should throw if the fetch fails', async () => {
        server.use(
            rest.get(validAssetJson.browser_download_url, (_req, res) => {
                return res.networkError('getaddrinfo ENOTFOUND')
            }),
        )

        const result = tryFetchReleaseNotes(validReleaseJson)

        expect(result).rejects.toThrow()
    })

    it('should throw if a non-JSON response is received', async () => {
        server.use(
            rest.get(validAssetJson.browser_download_url, (_req, res, ctx) => {
                return res(
                    ctx.status(200),
                    ctx.set('Content-Type', 'text/html'),
                    ctx.body('<html>hi</html>'),
                )
            }),
        )

        const result = tryFetchReleaseNotes(validReleaseJson)

        expect(result).rejects.toThrow()
    })

    it('should throw if the response does not match the schema', async () => {
        server.use(
            rest.get(validAssetJson.browser_download_url, (_req, res, ctx) => {
                return res(
                    ctx.status(200),
                    ctx.set('Content-Type', 'application/json'),
                    ctx.body(JSON.stringify(invalidReleaseNotesJson)),
                )
            }),
        )

        const result = tryFetchReleaseNotes(validReleaseJson)

        expect(result).rejects.toThrow()
    })

    it('should throw if the release notes asset is not found', async () => {
        const result = tryFetchReleaseNotes({
            ...validReleaseJson,
            assets: [notNotesAssetJson],
        })

        expect(result).rejects.toThrow()
    })
})
