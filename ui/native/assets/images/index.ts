/* eslint-disable @typescript-eslint/no-require-imports */
import { ImageSourcePropType } from 'react-native'

// TODO: Improve this typing, this allows people to access keys that haven't been defined.
interface ImagesMap {
    [key: string]: ImageSourcePropType
}

export const Images: ImagesMap = {
    FediLogo: require('./fedi-logo.webp'),
    FediQrLogo: require('./fedi-qr-logo.png'),
    HoloBackground: require('./holo-background.jpg'),
    GradientBackground: require('./gradient-background.webp'),
    HoloRing: require('./holo-ring.webp'),
    HoloBackgroundStrong: require('./holo-background-strong-900.webp'),
    HoloShield: require('@fedi/common/assets/images/holo-shield.webp'),
    HoloWallet: require('@fedi/common/assets/images/holo-wallet.webp'),
    IllustrationChat: require('@fedi/common/assets/images/illustration-chat.webp'),
    IllustrationWorld: require('@fedi/common/assets/images/illustration-world.webp'),
    IllustrationPin: require('@fedi/common/assets/images/illustration-pin.webp'),
    FallbackInset: require('@fedi/common/assets/images/fallback-inset.png'),
    AwesomeFedimint: require('@fedi/common/assets/images/awesome-fedimint.webp'),
    CommunityCreate: require('@fedi/common/assets/images/community-create-graphic.webp'),
    FederationCreate: require('@fedi/common/assets/images/federation-create-graphic.webp'),
    WelcomeBackground: require('@fedi/common/assets/images/welcome-bg.webp'),
    Red: require('@fedi/common/assets/images/red.png'),
    RateFederationBackground: require('@fedi/common/assets/images/rate-federation-bg.webp'),
    KeyringIcon: require('@fedi/common/assets/images/keyring.webp'),
    ProfileSecurityIcon: require('@fedi/common/assets/images/profile-security.webp'),
    SocialRecoveryIcon: require('@fedi/common/assets/images/social-recovery.webp'),
    SocialRecoveryFileIcon: require('@fedi/common/assets/images/social-recovery-file.webp'),
}

export const FediModImages: ImagesMap = {
    'ai-beta': require('@fedi/common/assets/images/fedimods/ai-beta.webp'),
    bitcoinco: require('@fedi/common/assets/images/fedimods/bitcoinco.webp'),
    bitrefill: require('@fedi/common/assets/images/fedimods/bitrefill.png'),
    btcmap: require('@fedi/common/assets/images/fedimods/btcmap.webp'),
    'btcprague-program': require('@fedi/common/assets/images/fedimods/btcprague-program.png'),
    'btcprague-useful': require('@fedi/common/assets/images/fedimods/btcprague-useful.png'),
    'btcprague-speakers': require('@fedi/common/assets/images/fedimods/btcprague-speakers.png'),
    'btcprague-side-events': require('@fedi/common/assets/images/fedimods/btcprague-side-events.png'),
    'bug-report': require('@fedi/common/assets/images/fedimods/bug-report.webp'),
    default: require('@fedi/common/assets/images/fedimods/default.png'),
    'fedi-community': require('@fedi/common/assets/images/fedimods/fedi-community.webp'),
    fedifeedback: require('@fedi/common/assets/images/fedimods/fedifeedback.png'),
    geyser: require('@fedi/common/assets/images/fedimods/geyser.webp'),
    hrf: require('@fedi/common/assets/images/fedimods/hrf.png'),
    ibex: require('@fedi/common/assets/images/fedimods/ibex.webp'),
    kollider: require('@fedi/common/assets/images/fedimods/kollider.webp'),
    lookingglass: require('@fedi/common/assets/images/fedimods/lookingglass.png'),
    'mutinynet-faucet': require('@fedi/common/assets/images/fedimods/mutinynet-faucet.webp'),
    'product-feedback': require('@fedi/common/assets/images/fedimods/product-feedback.png'),
    satscard: require('@fedi/common/assets/images/fedimods/satscard.png'),
    stackernews: require('@fedi/common/assets/images/fedimods/stackernews.png'),
    stakwork: require('@fedi/common/assets/images/fedimods/stakwork.png'),
    wavlake: require('@fedi/common/assets/images/fedimods/wavlake.png'),
    support: require('@fedi/common/assets/images/fedimods/support.webp'),
}

export const FediLoaders: ImageSourcePropType[] = [
    require('./loader/Fedi-Loading1.gif'),
    require('./loader/Fedi-Loading2.gif'),
    require('./loader/Fedi-Loading3.gif'),
    require('./loader/Fedi-Loading4.gif'),
]
