import { Federation, SupportedCurrency } from '../types'

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
}
