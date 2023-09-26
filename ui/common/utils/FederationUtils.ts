import { bech32m } from 'bech32'

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
                console.info(`Metadata fetch timed out after ${timeout}ms`)
                controller?.abort()
            }, timeout)
        }
        console.info('Fetching metadata from', externalUrl)
        const response = await fetch(externalUrl, {
            cache: 'no-cache',
            signal: controller?.signal,
        })
        const metaJson = await response.json()
        console.info(`Found metadata at ${externalUrl}`, Object.keys(metaJson))
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
                console.error(
                    'Failed to fetch metadata from external url',
                    error,
                )
                retryDelay += 3000
                console.info(
                    `Retrying fetch metadata in ${
                        retryDelay / 1000
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

export const getFederationDefaultCurrency = (
    metadata: ClientConfigMetadata,
): SupportedCurrency | null => {
    const supportedFeatures = getSupportedFeatures(
        metadata as ClientConfigMetadata,
    )
    if (supportedFeatures.includes(SupportedFeature.default_currency)) {
        return metadata?.default_currency as SupportedCurrency
    }

    return null
}

export const getFederationFixedExchangeRate = (
    metadata: ClientConfigMetadata,
): number | null => {
    const supportedFeatures = getSupportedFeatures(
        metadata as ClientConfigMetadata,
    )
    if (supportedFeatures.includes(SupportedFeature.fixed_exchange_rate)) {
        return Number(metadata?.fixed_exchange_rate)
    }

    return null
}

export const getFederationChatServerDomain = (
    metadata: ClientConfigMetadata,
): string | null => {
    const supportedFeatures = getSupportedFeatures(
        metadata as ClientConfigMetadata,
    )
    if (supportedFeatures.includes(SupportedFeature.chat_server_domain)) {
        return metadata?.chat_server_domain as string
    }
    return null
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
): MSats | null => {
    const supportedFeatures = getSupportedFeatures(
        metadata as ClientConfigMetadata,
    )
    if (supportedFeatures.includes(SupportedFeature.max_balance_msats)) {
        // This should just be a number but client config meta only
        // supports strings currently so will need to refactor
        return Number(metadata?.max_balance_msats) as MSats
    }
    return null
}

export const getFederationMaxInvoiceMsats = (
    metadata: ClientConfigMetadata,
): MSats | null => {
    const supportedFeatures = getSupportedFeatures(
        metadata as ClientConfigMetadata,
    )
    if (supportedFeatures.includes(SupportedFeature.max_invoice_msats)) {
        // This should just be a number but client config meta only
        // supports strings currently so will need to refactor
        return Number(metadata?.max_invoice_msats) as MSats
    }
    return null
}

// The utils below all involve the same inverse default logic where they
// should return true unless explicitly disabled via feature flag
export const shouldShowInviteCode = (
    metadata: ClientConfigMetadata,
): boolean => {
    const supportedFeatures = getSupportedFeatures(
        metadata as ClientConfigMetadata,
    )
    if (supportedFeatures.includes(SupportedFeature.invite_codes_disabled)) {
        // This is a boolean true/false but client config meta only
        // supports strings currently so will need to refactor
        return metadata.invite_codes_disabled === 'true' ? false : true
    }
    return true
}

export const shouldShowJoinFederation = (
    metadata: ClientConfigMetadata,
): boolean => {
    const supportedFeatures = getSupportedFeatures(
        metadata as ClientConfigMetadata,
    )
    if (supportedFeatures.includes(SupportedFeature.new_members_disabled)) {
        // This is a boolean true/false but client config meta only
        // supports strings currently so will need to refactor
        return metadata.new_members_disabled === 'true' ? false : true
    }
    return true
}

export const shouldShowSocialRecovery = (federation: Federation): boolean => {
    // Social recovery not supported on v0 federations
    if (federation.version === 0) {
        return false
    }
    const supportedFeatures = getSupportedFeatures(
        federation.meta as ClientConfigMetadata,
    )
    if (supportedFeatures.includes(SupportedFeature.social_recovery_disabled)) {
        // This is a boolean true/false but client config meta only
        // supports strings currently so will need to refactor
        return federation.meta.social_recovery_disabled === 'true'
            ? false
            : true
    }
    return true
}

export const shouldShowOfflineWallet = (
    metadata: ClientConfigMetadata,
): boolean => {
    const supportedFeatures = getSupportedFeatures(
        metadata as ClientConfigMetadata,
    )
    if (supportedFeatures.includes(SupportedFeature.offline_wallet_disabled)) {
        // This is a boolean true/false but client config meta only
        // supports strings currently so will need to refactor
        return metadata.offline_wallet_disabled === 'true' ? false : true
    }
    return true
}

export const shouldShowOnchainDeposits = (
    metadata: ClientConfigMetadata,
): boolean => {
    const supportedFeatures = getSupportedFeatures(
        metadata as ClientConfigMetadata,
    )
    if (
        supportedFeatures.includes(SupportedFeature.onchain_deposits_disabled)
    ) {
        // This is a boolean true/false but client config meta only
        // supports strings currently so will need to refactor
        return metadata.onchain_deposits_disabled === 'true' ? false : true
    }
    return false
}

export const getFederationGroupChats = (
    metadata: ClientConfigMetadata,
): string[] => {
    if (metadata.default_group_chats) {
        try {
            return JSON.parse(metadata.default_group_chats)
        } catch (err) {
            console.warn(
                'Failed to parse default groupchats',
                metadata.default_group_chats,
            )
        }
    }
    return []
}

export const getFederationFediMods = (
    metadata: ClientConfigMetadata,
): FediMod[] => {
    if (metadata.sites) {
        try {
            // TODO: validate type matches FediMod[]
            return JSON.parse(metadata.sites)
        } catch (err) {
            console.warn(
                'Failed to parse federation fedimods, falling back to defaults',
                metadata.sites,
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
    connectionCode: string,
): Promise<FederationPreview> {
    // See https://github.com/fedimint/fedimint/blob/e477569968b525a903aaae9aac0c87c914cd0cc2/fedimint-core/src/api.rs#L700-L730
    // for Rust-side implementation of connection codes.
    const { words } = bech32m.decode(connectionCode, Number.MAX_SAFE_INTEGER)
    const bytes = bech32m.fromWords(words)
    // First 48 bytes are the 32-bit encoded pubkey, which we don't need
    // const pubkeyBytes = bytes.slice(0, 48)
    // The next 2 bytes are the length of the URL
    const urlLenBytes = bytes.slice(48, 50)
    const urlLen = new DataView(new Uint8Array(urlLenBytes).buffer).getUint16(0)
    // The next `urlLen` bytes are the URL, UTF-16 encoded
    const url = String.fromCharCode(...bytes.slice(50, 50 + urlLen))
    // The remaining bytes are the download token, which we do not need to decode.
    // const downloadTokenBytes = bytes.slice(50 + urlLen)

    // Open a websocket to the URL we just pulled out. The Fedimint API is a
    // JSON RPC websocket. Rather than pull in a whole library for this, we'll
    // just do it manually since this is the only communication we do with the
    // federation outside of WASM.
    return new Promise((resolve, reject) => {
        try {
            const ws = new WebSocket(url)
            let id: FederationPreview['id']
            let name: FederationPreview['name']
            let meta: FederationPreview['meta']
            let consensusVersion: FederationPreview['consensusVersion']
            let apiVersion: FederationPreview['apiVersion']
            ws.addEventListener('error', () => {
                reject()
            })
            // Immediately send messages on open, responses come in message listener
            ws.addEventListener('open', () => {
                ws.send(
                    JSON.stringify({
                        id: 0,
                        jsonrpc: '2.0',
                        method: 'config',
                        params: [{ auth: null, params: connectionCode }],
                    }),
                )
                ws.send(
                    JSON.stringify({
                        id: 1,
                        jsonrpc: '2.0',
                        method: 'version',
                        params: [{ auth: null, params: null }],
                    }),
                )
            })
            // Listen for responses on open. Once we get all messages back,
            // resolve with data.If any of them fail, reject the promise.
            ws.addEventListener('message', async ev => {
                const data = JSON.parse(ev.data)
                if (data.error) {
                    return reject(new Error(data.error.message))
                }
                if (data.id === 0) {
                    id = data.result.client_config.federation_id
                    const extMeta = await fetchFederationsExternalMetadata([
                        { id, meta: data.result.client_config.meta },
                    ])
                    meta = extMeta[id] || data.result.client_config.meta
                    name =
                        meta.federation_name ||
                        data.result.client_config.meta.federation_name ||
                        'Unnamed federation'
                }
                if (data.id === 1) {
                    // Breaking API change in newer versions of fedimint
                    // TODO: Remove this ternary far in the future.
                    consensusVersion =
                        'core_consensus' in data.result.core
                            ? data.result.core.core_consensus
                            : data.result.core.consensus
                    if (typeof consensusVersion !== 'number') {
                        // No clue what this response is, make it some future version
                        console.warn(
                            'getFederationPreview: got unexpected consensusVersion, setting to 999',
                            { consensusVersion },
                        )
                        consensusVersion = 999
                    }

                    apiVersion = data.result.core.api[0]
                    if (
                        !apiVersion ||
                        typeof apiVersion.major !== 'number' ||
                        typeof apiVersion.minor !== 'number'
                    ) {
                        // No clue what this response is, make it some future version
                        console.warn(
                            'getFederationPreview: got unexpected apiVersion, setting to 999',
                            { apiVersion },
                        )
                        apiVersion = { major: 999, minor: 999 }
                    }
                }
                if (consensusVersion !== undefined && apiVersion && meta) {
                    resolve({
                        id,
                        name,
                        meta,
                        connectionCode,
                        consensusVersion,
                        apiVersion,
                    })
                }
            })
        } catch (err) {
            reject(err)
        }
    })
}
