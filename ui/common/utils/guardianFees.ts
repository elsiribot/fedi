import type { TFunction } from 'i18next'

export const formatGuardianFeeModuleLabel = (module: string, t: TFunction) => {
    switch (module) {
        case 'ln':
            return t('words.lightning')
        case 'mint':
            return t('words.ecash')
        case 'wallet':
            return t('words.onchain')
        case 'multi_sig_stability_pool':
        case 'stability_pool':
            return t('feature.stabilitypool.stable-balance')
        default:
            return module.replace(/_/g, ' ')
    }
}
