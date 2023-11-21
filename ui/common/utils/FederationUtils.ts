import { z } from 'zod'

import { DEFAULT_FEDIMODS } from '@fedi/common/constants/fedimods'

import { XMPP_RESOURCE } from '../constants/xmpp'
import {
    ClientConfigMetadata,
    Federation,
    MSats,
    FediMod,
    SupportedCurrency,
    SupportedFeature,
    XmppConnectionOptions,
    FederationPreview,
} from '../types'
import { makeLog } from './log'
import { FedimintBridge } from './fedimint'

const log = makeLog('common/utils/FederationUtils')

type ExternalMetaJson = Record<string, Federation['meta'] | undefined>

/**
 * Given a URL, attempt to fetch external metadata. Returns a promise
 * that resolves with the initial attempt to fetch external metadata. If the fetch
 * fails for any reason, returns undefined instead of throwing. If passed an
 * optional callback, will continue to attempt fetches in the background with
 * an increasing backoff and emit to the callback on success.
 */
const fetchExternalMetadata = async (
    externalUrl: string,
    onBackgroundSuccess?: (externalMeta: ExternalMetaJson) => void,
): Promise<ExternalMetaJson | undefined> => {
    const attemptFetch = async (timeout?: number) => {
        let controller: AbortController | undefined
        let timeoutId: ReturnType<typeof setTimeout> | undefined
        if (timeout) {
            controller = new AbortController()
            timeoutId = setTimeout(() => {
                log.info(`Metadata fetch timed out after ${timeout}ms`)
                controller?.abort()
            }, timeout)
        }
        log.info('Fetching metadata from', externalUrl)
        const response = await fetch(externalUrl, {
            cache: 'no-cache',
            signal: controller?.signal,
        })
        const metaJson = await response.json()
        log.info(`Found metadata at ${externalUrl}`, Object.keys(metaJson))
        if (timeoutId) {
            clearTimeout(timeoutId)
        }
        return metaJson
    }

    try {
        // If provided an onBackgroundSuccess, abort the initial fetch after
        // two seconds and try again shortly with no abort timer. Otherwise
        // allow the initial and only request to run for as long as it takes.
        const res = await attemptFetch(onBackgroundSuccess ? 2000 : undefined)
        return res
    } catch (err) {
        if (!onBackgroundSuccess) return
        let retryDelay = 1000
        const retryInBackground = async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, retryDelay))
                const meta = await attemptFetch()
                onBackgroundSuccess(meta)
            } catch (error) {
                log.error('Failed to fetch metadata from external url', error)
                retryDelay += 3000
                log.info(
                    `Retrying fetch metadata in ${retryDelay / 1000
                    } seconds...`,
                )
                retryInBackground() // Recursive call
            }
        }
        retryInBackground()
    }
}

/**
 * Runs `fetchFederationExternalMetadata` on a list of federations and assembles
 * the results as a map of federation id -> meta. Optional callback is called with
 * (federationId, meta).
 */
export const fetchFederationsExternalMetadata = (
    federations: Pick<Federation, 'id' | 'meta'>[],
    onBackgroundSuccess?: (
        federationId: Federation['id'],
        meta: Federation['meta'],
    ) => void,
): Promise<ExternalMetaJson> => {
    // Collect & dedpulicate external meta URLs
    const externalUrls = federations
        .map(f => f.meta.meta_external_url)
        .filter((url, idx, arr): url is string =>
            Boolean(url && arr.indexOf(url) === idx),
        )

    // Given an external meta, return a list of federation id -> meta for all matching federations
    const getFederationMetaEntries = (externalMeta: ExternalMetaJson) => {
        const entries: [Federation['id'], Federation['meta']][] = []
        for (const federation of federations) {
            const fedMeta = externalMeta[federation.id]
            if (fedMeta) {
                entries.push([federation.id, fedMeta])
            }
        }
        return entries
    }

    // When results come in in the background, hit the callback for relevant federations
    const handleBackgroundSuccess = onBackgroundSuccess
        ? (externalMeta: ExternalMetaJson) => {
            const entries = getFederationMetaEntries(externalMeta)
            entries.forEach(([id, meta]) => onBackgroundSuccess(id, meta))
        }
        : undefined

    // Assemble all the promises and return the first pass of results. If they
    // provided onBackgroundSuccess, we'll call those as they come in.
    return Promise.all(
        externalUrls.map(async url =>
            fetchExternalMetadata(url, handleBackgroundSuccess),
        ),
    ).then(results =>
        results.reduce<ExternalMetaJson>((prev, extMeta) => {
            if (!extMeta) return prev
            const entries = getFederationMetaEntries(extMeta)
            for (const entry of entries) {
                prev[entry[0]] = entry[1]
            }
            return prev
        }, {}),
    )
}

export const getSupportedFeatures = (
    meta: ClientConfigMetadata,
): SupportedFeature[] => {
    const features: SupportedFeature[] = []

    for (const feature in SupportedFeature) {
        if (Object.keys(meta).includes(feature)) {
            features.push(feature as SupportedFeature)
        }
    }

    return features
}

const getMetaField = (
    field: SupportedFeature | 'sites' | 'fedimods' | 'default_group_chats',
    metadata: ClientConfigMetadata,
): string | null => {
    if (field === 'sites' || field === 'fedimods') {
        return (
            metadata[`fedi:fedimods`] ??
            metadata[`fedi:sites`] ??
            metadata[field] ??
            null
        )
    }

    if (field === 'default_group_chats') {
        return metadata[`fedi:default_group_chats`] ?? metadata[field] ?? null
    }

    if (Object.values(SupportedFeature).some(x => x === field)) {
        return metadata[`fedi:${field}`] ?? metadata[field] ?? null
    }

    return null
}

export const getFederationDefaultCurrency = (
    metadata: ClientConfigMetadata,
) => {
    return getMetaField(
        SupportedFeature.default_currency,
        metadata,
    ) as SupportedCurrency | null
}

export const getFederationFixedExchangeRate = (
    metadata: ClientConfigMetadata,
) => {
    const exchangeRate = getMetaField(
        SupportedFeature.fixed_exchange_rate,
        metadata,
    )

    if (typeof exchangeRate !== 'string') return null

    return Number(exchangeRate)
}

export const getFederationChatServerDomain = (
    metadata: ClientConfigMetadata,
) => {
    return getMetaField(SupportedFeature.chat_server_domain, metadata)
}

export const makeChatServerOptions = (
    domain: string,
): XmppConnectionOptions => {
    return {
        domain,
        mucDomain: `muc.${domain}`,
        resource: XMPP_RESOURCE,
        service: `wss://${domain}/xmpp-websocket`,
    }
}

export const getFederationMaxBalanceMsats = (
    metadata: ClientConfigMetadata,
) => {
    const maxBalanceSats = getMetaField(
        SupportedFeature.max_balance_msats,
        metadata,
    )

    // This should just be a number but client config meta only
    // supports strings currently so will need to refactor
    return typeof maxBalanceSats !== 'string'
        ? undefined
        : (Number(maxBalanceSats) as MSats)
}

export const getFederationMaxInvoiceMsats = (
    metadata: ClientConfigMetadata,
) => {
    const maxInvoiceMsats = getMetaField(
        SupportedFeature.max_invoice_msats,
        metadata,
    )
    // This should just be a number but client config meta only
    // supports strings currently so will need to refactor
    return typeof maxInvoiceMsats !== 'string'
        ? undefined
        : (Number(maxInvoiceMsats) as MSats)
}

// The utils below all involve the same inverse default logic where they
// should return true unless explicitly disabled via feature flag
export const shouldShowInviteCode = (metadata: ClientConfigMetadata) => {
    // This is a boolean true/false but client config meta only
    // supports strings currently so will need to refactor
    return (
        getMetaField(SupportedFeature.invite_codes_disabled, metadata) !==
        'true'
    )
}

export const shouldShowJoinFederation = (metadata: ClientConfigMetadata) => {
    return (
        getMetaField(SupportedFeature.new_members_disabled, metadata) !==
        'false'
    )
}

export const shouldShowSocialRecovery = (federation: Federation) => {
    // Social recovery not supported on v0 federations
    if (federation.version === 0) {
        return false
    }

    return (
        getMetaField(
            SupportedFeature.social_recovery_disabled,
            federation.meta,
        ) !== 'true'
    )
}

export const shouldShowOfflineWallet = (
    metadata: ClientConfigMetadata,
): boolean => {
    return (
        getMetaField(SupportedFeature.offline_wallet_disabled, metadata) !==
        'true'
    )
}

export const shouldShowOnchainDeposits = (metadata: ClientConfigMetadata) => {
    return (
        getMetaField(SupportedFeature.onchain_deposits_disabled, metadata) !==
        'true'
    )
}

export const shouldEnableNostr = (federation: Federation) => {
    // Nostr RPCs not supported on v0 federations
    if (federation.version === 0) {
        return false
    }

    return (
        getMetaField(SupportedFeature.nostr_enabled, federation.meta) === 'true'
    )
}

export const getFederationGroupChats = (
    metadata: ClientConfigMetadata,
): string[] => {
    const defaultGroupChats = getMetaField('default_group_chats', metadata)

    if (defaultGroupChats) {
        try {
            return JSON.parse(defaultGroupChats)
        } catch (err) {
            log.warn('Failed to parse default groupchats', defaultGroupChats)
        }
    }
    return []
}

export const getFederationFediMods = (
    metadata: ClientConfigMetadata,
): FediMod[] => {
    const sites = getMetaField('sites', metadata)
    const fediModSchema: z.ZodSchema<FediMod[]> = z.array(
        z.object({
            id: z.string(),
            title: z.string(),
            url: z.string().url(),
            imageUrl: z.string().url().optional(),
            description: z.string().optional(),
            color: z.string().optional(),
        }),
    )

    if (sites) {
        try {
            // TODO: validate type matches FediMod[]
            const res = fediModSchema.safeParse(JSON.stringify(sites))

            if (!res.success) {
                throw res.error
            }

            return res.data
        } catch (err) {
            log.error((err as Error | z.ZodError).message)
            log.warn(
                'Failed to parse federation fedimods, falling back to defaults',
                sites,
            )
        }
    }

    // FIXME: if metadata fails to fetch, we render an empty array since this
    // would be less confusing than showing a totally different set of Fedimods
    // there shoud be a proper loader / robust handling for figuring out if we
    // should fallback on default Fedimods
    return []
    return DEFAULT_FEDIMODS
}

/**
 * Fetch information about a federation without using the bridge wasm. This
 * allows us to fetch federation info before the bridge is loaded.
 */
export async function getFederationPreview(
    inviteCode: string,
    fedimint: FedimintBridge,
): Promise<FederationPreview> {
    return fedimint.federationPreview(inviteCode)
}
