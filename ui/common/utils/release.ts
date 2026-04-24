import { z } from 'zod'

import { GITHUB_RELEASES_API_URL } from '../constants/release'
import { makeLog } from './log'

const log = makeLog('common/utils/release')

/**
 * Zod schema defining the fields of an item of a GitHub release asset that we care about
 *
 * .passthrough() ignores the other fields
 */
export const releaseAssetSchema = z
    .object({
        name: z.string(),
        browser_download_url: z.string().url(),
    })
    .passthrough()

/**
 * Zod schema defining the fields of a GitHub release that we care about
 * https://docs.github.com/en/rest/releases/releases?apiVersion=2026-03-10#get-the-latest-release
 *
 * .passthrough() ignores the other fields
 */
export const releaseJsonSchema = z
    .object({
        id: z.number(),
        tag_name: z.string(),
        assets: z.array(releaseAssetSchema),
    })
    .passthrough()

/**
 * Zod schema defining the shape of the release-notes.json file
 * that should be uploaded to the latest GitHub release
 */
const releaseNotesJsonSchema = z
    .object({ en: z.string() })
    .and(z.record(z.string()))

export type ReleaseJson = z.infer<typeof releaseJsonSchema>
export type ReleaseAsset = z.infer<typeof releaseAssetSchema>
export type ReleaseNotesJson = z.infer<typeof releaseNotesJsonSchema>

/**
 * Attempts to fetch the latest release of the Fedi public GitHub repo
 */
export async function tryFetchReleaseSchema(): Promise<ReleaseJson> {
    log.info('(Start) [fetch latest public release from GitHub]')

    try {
        const res = await fetch(GITHUB_RELEASES_API_URL)

        if (!res.ok) throw new Error('HTTP response was not OK')

        const json = await res.json()

        return releaseJsonSchema.parse(json)
    } catch (err) {
        log.error('(Error) [fetch latest public release from GitHub]', err)
        throw err
    } finally {
        log.info('(Finish) [fetch latest public release from GitHub]')
    }
}

/**
 * Given an object matching the releaseJsonSchema, attempts to find and fetch the
 * contents of the release-notes.json asset included with the release
 */
export async function tryFetchReleaseNotes(
    release: ReleaseJson,
): Promise<ReleaseNotesJson> {
    const releaseNotesUrl = release.assets.find(
        asset => asset.name === 'release-notes.json',
    )?.browser_download_url

    if (!releaseNotesUrl) {
        throw new Error(
            '(Error) [Fetching release notes from GitHub] release-notes.json not found',
        )
    }

    log.info('(Start) [Fetching release notes from GitHub]')

    try {
        const res = await fetch(releaseNotesUrl)

        if (!res.ok) throw new Error('HTTP response was not OK')

        const json = await res.json()

        return releaseNotesJsonSchema.parse(json)
    } catch (err) {
        log.error('(Error) [Fetching release notes from GitHub]', err)
        throw err
    } finally {
        log.info('(Finish) [Fetching release notes from GitHub]')
    }
}
