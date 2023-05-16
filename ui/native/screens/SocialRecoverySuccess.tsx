import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { selectAuthenticatedMember } from '@fedi/common/redux'

import Success from '../components/ui/Success'
import { useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'SocialRecoverySuccess'
>

const SocialRecoverySuccess: React.FC<Props> = () => {
    const { t } = useTranslation()
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)

    return (
        <Success
            messageText={t('feature.recovery.you-completed-social-recovery')}
            buttonText={t('words.okay')}
            // returning members might still need to set their username
            nextScreen={authenticatedMember ? 'TabsNavigator' : 'Initializing'}
        />
    )
}

export default SocialRecoverySuccess
