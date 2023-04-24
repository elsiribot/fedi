import { XMPP_RESOURCE } from '../constants/xmpp'
import { Federation, SupportedCurrency, XmppConnectionOptions } from '../types'

export default class FederationUtils {
    private federation: Federation

    constructor(federation: Federation) {
        this.federation = federation
    }

    // TODO: Remove this when Federation.defaultCurrency is available
    getDefaultCurrency(): SupportedCurrency {
        return this.federation.name.toLowerCase().includes('togo')
            ? SupportedCurrency.CFA
            : SupportedCurrency.USD
    }
    // TODO: Remove this when Federation.stealthMode is available
    getShowInviteCode(): boolean {
        return this.federation.name.toLowerCase().includes('togo')
            ? false
            : true
    }
    // TODO: Refactor this when Federation.chatServerUrl is available
    getChatServerOptions(): XmppConnectionOptions {
        let domain = 'xmpp-02.dev.fedibtc.com'
        if (this.federation.name.toLowerCase().includes('togo')) {
            domain = 'xmpp-03.dev.fedibtc.com'
        }
        const options = {
            domain,
            mucDomain: `muc.${domain}`,
            resource: XMPP_RESOURCE,
            service: `wss://${domain}/xmpp-websocket`,
        }

        return options
    }
}
