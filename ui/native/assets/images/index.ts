import { ImageSourcePropType } from 'react-native'

interface ImagesMap {
    [key: string]: ImageSourcePropType
}

export const Images: ImagesMap = {
    FediLogo: require('./fedi-logo.png'),
    FediQrLogo: require('./fedi-qr-logo.png'),
    HoloBackground: require('./holo-background.jpg'),
    HoloBackgroundStrong: require('./holo-background-strong-900.png'),
    IllustrationWorld: require('@fedi/common/assets/images/illustration-world.png'),
}

export const FediModImages: ImagesMap = {
    'ai-beta': require('@fedi/common/assets/images/sites/ai-beta.png'),
    'bitcoinco': require('@fedi/common/assets/images/sites/bitcoinco.png'),
    'bitrefill': require('@fedi/common/assets/images/sites/bitrefill.png'),
    'btcmap': require('@fedi/common/assets/images/sites/btcmap.png'),
    'btcprague-program': require('@fedi/common/assets/images/sites/btcprague-program.png'),
    'btcprague-useful': require('@fedi/common/assets/images/sites/btcprague-useful.png'),
    'btcprague-speakers': require('@fedi/common/assets/images/sites/btcprague-speakers.png'),
    'btcprague-side-events': require('@fedi/common/assets/images/sites/btcprague-side-events.png'),
    'default': require('@fedi/common/assets/images/sites/default.png'),
    'fedi-community': require('@fedi/common/assets/images/sites/fedi-community.png'),
    'fedifeedback': require('@fedi/common/assets/images/sites/fedifeedback.png'),
    'geyser': require('@fedi/common/assets/images/sites/geyser.png'),
    'hrf': require('@fedi/common/assets/images/sites/hrf.png'),
    'ibex': require('@fedi/common/assets/images/sites/ibex.png'),
    'kollider': require('@fedi/common/assets/images/sites/kollider.png'),
    'lookingglass': require('@fedi/common/assets/images/sites/lookingglass.png'),
    'mutinynet-faucet': require('@fedi/common/assets/images/sites/mutinynet-faucet.png'),
    'product-feedback': require('@fedi/common/assets/images/sites/product-feedback.png'),
    'satscard': require('@fedi/common/assets/images/sites/satscard.png'),
    'stackernews': require('@fedi/common/assets/images/sites/stackernews.png'),
    'stakwork': require('@fedi/common/assets/images/sites/stakwork.png'),
    'wavlake': require('@fedi/common/assets/images/sites/wavlake.png'),
}
