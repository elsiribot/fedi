import { XMPP_RESOURCE } from '../constants/xmpp'
import {
    Federation,
    SupportedCurrency,
    SupportedFeature,
    XmppConnectionOptions,
} from '../types'

export default class FederationUtils {
    private federation: Federation

    constructor(federation: Federation) {
        this.federation = federation
    }

    getSupportedFeatures(): SupportedFeature[] {
        const { meta } = this.federation
        const features = []

        for (const feature in SupportedFeature) {
            if (Object.keys(meta).includes(feature)) {
                features.push(feature as SupportedFeature)
            }
        }

        return features
    }

    getDefaultCurrency(): SupportedCurrency {
        if (
            this.getSupportedFeatures().includes(
                SupportedFeature.default_currency,
            )
        ) {
            return this.federation.meta.default_currency as SupportedCurrency
        }

        return SupportedCurrency.USD
    }

    getShowInviteCode(): boolean {
        if (
            this.getSupportedFeatures().includes(
                SupportedFeature.invite_codes_disabled,
            )
        ) {
            // This is a boolean true/false but client config meta only
            // supports strings currently so will need to refactor
            return this.federation.meta.invite_codes_disabled === 'true'
                ? false
                : true
        }

        return true
    }

    getChatServerOptions(): XmppConnectionOptions | null {
        if (
            this.getSupportedFeatures().includes(
                SupportedFeature.chat_server_domain,
            )
        ) {
            let domain = this.federation.meta.chat_server_domain
            const options = {
                domain,
                mucDomain: `muc.${domain}`,
                resource: XMPP_RESOURCE,
                service: `wss://${domain}/xmpp-websocket`,
            }

            return options
        }

        return null
    }
}
