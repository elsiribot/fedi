import { Options } from '@xmpp/client'

import i18n from './localization/i18n'

// Regtest feds
export const FEDERATION_ALPHA =
    '{"members":[[0,"wss://alpha.regtest.sirion.io"]]}'
export const FEDERATION_BRAVO =
    '{"members":[[0,"wss://bravo.regtest.sirion.io"]]}'
// Signet feds
export const FEDERATION_SIGNET =
    '{"members":[[0,"wss://fm-signet.sirion.io:443"]]}'

export const TEST_FEDERATION = FEDERATION_ALPHA
export const FEDERATIONS_PERSISTENCE_KEY = 'AsyncStorage-FederationsContext'
export const COMMUNITY_PERSISTENCE_KEY = 'AsyncStorage-CommunityContext'
export const COMMUNITY_MEMBERS_PERSISTENCE_KEY =
    'AsyncStorage-CommunityContext-members'
export const COMMUNITY_MESSAGES_PERSISTENCE_KEY =
    'AsyncStorage-CommunityContext-messages'
export const COMMUNITY_ROOMS_PERSISTENCE_KEY =
    'AsyncStorage-CommunityContext-rooms'

export const DEFAULT_ROOM_NAME = i18n.t('feature.community.new-room')
export const XMPP_DOMAIN = 'xmpp.dev.fedibtc.com'
// This is the XMPP Multi-User-Chat (MUC) domain defined
// in prosody.config.lua on the XMPP server
// https://prosody.im/doc/modules/mod_muc
export const XMPP_MUC_DOMAIN = 'xmpp-rooms.dev.fedibtc.com'
export const XMPP_SERVICE = 'wss://xmpp.dev.fedibtc.com:5281/xmpp-websocket'
export const XMPP_MOCK_PASSWORD = 'abcdefgh12345678'
export const XMPP_RESOURCE = 'community'
export const XMPP_CONNECTION_OPTIONS: Options = {
    service: XMPP_SERVICE,
    resource: XMPP_RESOURCE,
}

export const SITES = [
    // TODO: Show only for regtest federations
    // shouldn't be used on mainnet
    // {
    //     id: 'testfed',
    //     title: 'testfed',
    //     url: 'https://testfed.xyz/webln',
    //     description: 'A regtest playground',
    // },
    {
        id: 'geyser',
        title: 'Geyser Fund',
        url: 'https://geyser.fund',
        description: 'Crowdfunding with bitcoin',
    },
    {
        id: 'bitrefill',
        title: 'Bitrefill',
        url: 'https://bitrefill.com',
        description: 'Pay for your daily needs with Bitcoin',
    },
    {
        id: 'stakwork',
        title: 'Stakwork',
        url: 'https://jobs.stakwork.com/workers',
        description: 'Earn bitcoin for completing microtasks',
    },
    {
        id: 'stackernews',
        title: 'Stacker.News',
        url: 'https://stacker.news',
        description: 'Read about the latest bitcoin news',
    },
    {
        id: 'btcmap',
        title: 'BTCMAP',
        url: 'https://btcmap.org',
        description: 'See where bitcoin is being used all over the world',
    },
    // {
    //     id: 'kollider',
    //     title: 'Kollider',
    //     url: 'https://light.kollider.xyz/auth/login',
    //     description:
    //         'Like cash in hand, pass physical bitcoin along multiple times',
    // },
    // {
    //     id: 'wavlake',
    //     title: 'WavLake',
    //     url: 'https://wavlake.com',
    //     description: 'Listen to music',
    // },
    // {
    //     id: 'ibex',
    //     title: 'Ibex Pay',
    //     url: 'https://ibexmercado.com',
    //     description:
    //         'Easiest way for businesses to receive instant bitcoin payments via Lightning',
    // },
    // {
    //     id: 'lookingglass',
    //     title: 'The Looking Glass Education',
    //     url: 'https://lookingglasseducation.com/',
    //     description:
    //         'Developing global educational content that highlights the ingenuity and potential of bitcoin',
    // },
    // {
    //     id: 'satscard',
    //     title: 'Satscard',
    //     url: 'https://satscard.com',
    //     description:
    //         'Like cash in hand, pass physical bitcoin along multiple times',
    // },
]
