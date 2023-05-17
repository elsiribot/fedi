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

export const SiteImages: ImagesMap = {
    'bitcoinco': require('@fedi/common/assets/images/sites/bitcoinco.png'),
    'bitrefill': require('@fedi/common/assets/images/sites/bitrefill.png'),
    'btcmap': require('@fedi/common/assets/images/sites/btcmap.png'),
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
