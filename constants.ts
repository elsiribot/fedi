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

export const SITES = [
    {
        title: 'testfed',
        url: 'https://testfed.xyz/webln',
        description: 'A regtest playground',
    },
    {
        title: 'Kollider',
        url: 'https://light.kollider.xyz/auth/login',
        description:
            'Like cash in hand, pass physical bitcoin along multiple times',
        lnurlAuth: 'https://api.kollider.xyz/v1/auth/external/lnurl_auth',
    },
    {
        title: 'BTCMAP',
        url: 'https://btcmap.org',
        description: 'See where bitcoin is being used all over the world',
    },
    {
        title: 'WavLake',
        url: 'https://wavlake.com',
        description: 'Listen to music',
    },
    {
        title: 'Ibex Pay',
        url: 'https://ibexmercado.com',
        description:
            'Easiest way for businesses to receive instant bitcoin payments via Lightning',
    },
    {
        title: 'Stacker.News',
        url: 'https://stacker.news',
        description: 'Read about the latest bitcoin news',
    },
    {
        title: 'Geyser Fund',
        url: 'https://geyser.fund',
        description: 'Crowdfunding with bitcoin',
    },
    {
        title: 'The Looking Glass Education',
        url: 'https://lookingglasseducation.com/',
        description:
            'Developing global educational content that highlights the ingenuity and potential of bitcoin',
    },
    {
        title: 'Satscard',
        url: 'https://satscard.com',
        description:
            'Like cash in hand, pass physical bitcoin along multiple times',
    },
]
