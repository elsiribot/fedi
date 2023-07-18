import { Federation, MSats, Network, SupportedCurrency } from '../../types'
import {
    getFederationChatServerDomain,
    getFederationDefaultCurrency,
    getSupportedFeatures,
    makeChatServerOptions,
    shouldShowInviteCode,
} from '../../utils/FederationUtils'

const SAMPLE_CHAT_SERVER_DOMAIN = 'chat.dev.fedibtc.com'

const baseFed = {
    id: 'fedid',
    name: 'testfed',
    inviteCode: 'tesfedinvitecode',
    nodes: { '0': { name: 'alpha', url: 'alphaurl' } },
    balance: 0 as MSats,
    socialRecoveryActive: false,
    network: Network.regtest,
}

const fedWithNoMetadata: Federation = {
    ...baseFed,
    meta: {},
}

const fedWithFeatures: Federation = {
    ...baseFed,
    meta: {
        default_currency: SupportedCurrency.EUR,
        chat_server_domain: SAMPLE_CHAT_SERVER_DOMAIN,
    },
}

const fedInvitesDisabled: Federation = {
    ...baseFed,
    meta: {
        default_currency: SupportedCurrency.EUR,
        chat_server_domain: SAMPLE_CHAT_SERVER_DOMAIN,
        invite_codes_disabled: 'true',
    },
}

const fedInvitesEnabled: Federation = {
    ...baseFed,
    meta: {
        default_currency: SupportedCurrency.EUR,
        chat_server_domain: SAMPLE_CHAT_SERVER_DOMAIN,
        invite_codes_disabled: 'false',
    },
}

describe('FederationUtils', () => {
    describe('getSupportedFeatures', () => {
        it('returns an empty array with empty metadata', () => {
            const supportedFeatures = getSupportedFeatures(
                fedWithNoMetadata.meta,
            )

            expect(supportedFeatures).toHaveLength(0)
        })
    })
    describe('getFederationDefaultCurrency', () => {
        it('returns federation currency from metadata', () => {
            const defaultCurrency = getFederationDefaultCurrency(
                fedWithFeatures.meta,
            )

            expect(defaultCurrency).toEqual(SupportedCurrency.EUR)
        })
        it('returns null if not supported', () => {
            const defaultCurrency = getFederationDefaultCurrency(
                fedWithNoMetadata.meta,
            )

            expect(defaultCurrency).toBeNull()
        })
    })
    describe('shouldShowInviteCode', () => {
        it('returns false if configured in metadata', () => {
            const showInviteCode = shouldShowInviteCode(fedInvitesDisabled.meta)

            expect(showInviteCode).toEqual(false)
        })
        it('returns true if configured in metadata', () => {
            const showInviteCode = shouldShowInviteCode(fedInvitesEnabled.meta)

            expect(showInviteCode).toEqual(true)
        })
        it('returns true if not supported', () => {
            const showInviteCode = shouldShowInviteCode(fedWithNoMetadata.meta)

            expect(showInviteCode).toEqual(true)
        })
    })
    describe('getFederationChatServerDomain', () => {
        it('returns chat server domain from metadata', () => {
            const chatServerDomain = getFederationChatServerDomain(
                fedWithFeatures.meta,
            )

            expect(chatServerDomain).toEqual(chatServerDomain)
        })
        it('returns null if not supported', () => {
            const chatServerDomain = getFederationChatServerDomain(
                fedWithNoMetadata.meta,
            )

            expect(chatServerDomain).toBeNull()
        })
    })
    describe('makeChatServerOptions', () => {
        it('returns connection options from server domain', () => {
            const connectionOptions = makeChatServerOptions(
                SAMPLE_CHAT_SERVER_DOMAIN,
            )

            expect(connectionOptions).toHaveProperty('domain')
            expect(connectionOptions).toHaveProperty('mucDomain')
            expect(connectionOptions).toHaveProperty('resource')
            expect(connectionOptions).toHaveProperty('service')
            expect(connectionOptions.domain).toEqual(SAMPLE_CHAT_SERVER_DOMAIN)
            expect(connectionOptions.mucDomain).toContain(
                SAMPLE_CHAT_SERVER_DOMAIN,
            )
            expect(connectionOptions.service).toContain(
                SAMPLE_CHAT_SERVER_DOMAIN,
            )
        })
    })
})
