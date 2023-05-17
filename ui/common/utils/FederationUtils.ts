import { SITES } from '../constants/sites'
import { XMPP_RESOURCE } from '../constants/xmpp'
import {
    ClientConfigMetadata,
    MSats,
    Site,
    SupportedCurrency,
    SupportedFeature,
    XmppConnectionOptions,
} from '../types'

export const getSupportedFeatures = (
    meta: ClientConfigMetadata,
): SupportedFeature[] => {
    const features = []

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
    chatServerDomain: string,
): XmppConnectionOptions => {
    let domain = chatServerDomain
    const options = {
        domain,
        mucDomain: `muc.${domain}`,
        resource: XMPP_RESOURCE,
        service: `wss://${domain}/xmpp-websocket`,
    }

    return options
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

export const shouldShowSocialRecovery = (
    metadata: ClientConfigMetadata,
): boolean => {
    return true
    const supportedFeatures = getSupportedFeatures(
        metadata as ClientConfigMetadata,
    )
    if (supportedFeatures.includes(SupportedFeature.social_recovery_disabled)) {
        // This is a boolean true/false but client config meta only
        // supports strings currently so will need to refactor
        return metadata.social_recovery_disabled === 'true' ? false : true
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
        return metadata.social_recovery_disabled === 'true' ? false : true
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
        return metadata.social_recovery_disabled === 'true' ? false : true
    }
    return true
}

export const getFederationSites = (metadata: ClientConfigMetadata): Site[] => {
    if (metadata.sites) {
        try {
            // TODO: validate type matches Site[]
            return JSON.parse(metadata.sites)
        } catch (err) {
            console.warn(
                'Failed to parse federation sites, falling back to defaults',
                metadata.sites,
            )
        }
    }
    return SITES
}
