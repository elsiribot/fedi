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
    bitcoinco: require('./sites/bitcoinco.png'),
    bitrefill: require('./sites/bitrefill.png'),
    btcmap: require('./sites/btcmap.png'),
    fedifeedback: require('./sites/fedifeedback.png'),
    geyser: require('./sites/geyser.png'),
    hrf: require('./sites/hrf.png'),
    ibex: require('./sites/ibex.png'),
    kollider: require('./sites/kollider.png'),
    lookingglass: require('./sites/lookingglass.png'),
    satscard: require('./sites/satscard.png'),
    stackernews: require('./sites/stackernews.png'),
    stakwork: require('./sites/stakwork.png'),
    wavlake: require('./sites/wavlake.png'),
}
