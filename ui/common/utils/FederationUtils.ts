import { XMPP_RESOURCE } from '../constants/xmpp'
import {
    ClientConfigMetadata,
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
): SupportedCurrency => {
    const supportedFeatures = getSupportedFeatures(
        metadata as ClientConfigMetadata,
    )
    if (supportedFeatures.includes(SupportedFeature.default_currency)) {
        return metadata?.default_currency as SupportedCurrency
    }

    return SupportedCurrency.USD
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
