import { StaticImageData } from 'next/image'

import bitcoincoImage from '@fedi/common/assets/images/sites/bitcoinco.png'
import bitrefillImage from '@fedi/common/assets/images/sites/bitrefill.png'
import btcmapImage from '@fedi/common/assets/images/sites/btcmap.png'
import fediCommunityImage from '@fedi/common/assets/images/sites/fedi-community.png'
import fedifeedbackImage from '@fedi/common/assets/images/sites/fedifeedback.png'
import geyserImage from '@fedi/common/assets/images/sites/geyser.png'
import hrfImage from '@fedi/common/assets/images/sites/hrf.png'
import ibexImage from '@fedi/common/assets/images/sites/ibex.png'
import kolliderImage from '@fedi/common/assets/images/sites/kollider.png'
import lookingglassImage from '@fedi/common/assets/images/sites/lookingglass.png'
import mutinynetFaucetImage from '@fedi/common/assets/images/sites/mutinynet-faucet.png'
import productFeedbackImage from '@fedi/common/assets/images/sites/product-feedback.png'
import satscardImage from '@fedi/common/assets/images/sites/satscard.png'
import stackernewsImage from '@fedi/common/assets/images/sites/stackernews.png'
import stakworkImage from '@fedi/common/assets/images/sites/stakwork.png'
import wavlakeImage from '@fedi/common/assets/images/sites/wavlake.png'

export const SITE_IMAGES: Record<string, StaticImageData | undefined> = {
    bitcoinco: bitcoincoImage,
    bitrefill: bitrefillImage,
    btcmap: btcmapImage,
    'fedi-community': fediCommunityImage,
    fedifeedback: fedifeedbackImage,
    geyser: geyserImage,
    hrf: hrfImage,
    ibex: ibexImage,
    kollider: kolliderImage,
    lookingglass: lookingglassImage,
    'mutinynet-faucet': mutinynetFaucetImage,
    'product-feedback': productFeedbackImage,
    satscard: satscardImage,
    stackernews: stackernewsImage,
    stakwork: stakworkImage,
    wavlake: wavlakeImage,
}
