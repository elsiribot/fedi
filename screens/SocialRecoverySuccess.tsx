import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

import type { RootStackParamList } from '../types/navigation'
import Success from '../components/ui/Success'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'SocialRecoverySuccess'
>

const SocialRecoverySuccess: React.FC<Props> = () => {
    const { t } = useTranslation()

    return (
        <Success
            messageText={t('feature.recovery.you-completed-social-recovery')}
            buttonText={t('words.okay')}
        />
    )
}

export default SocialRecoverySuccess
