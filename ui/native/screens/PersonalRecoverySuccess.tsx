import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { selectRegisteredDevices } from '@fedi/common/redux'

import Success from '../components/ui/Success'
import { useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'PersonalRecoverySuccess'
>

const PersonalRecoverySuccess: React.FC<Props> = () => {
    const { t } = useTranslation()
    const registeredDevices = useAppSelector(selectRegisteredDevices)

    return (
        <Success
            messageText={t('feature.recovery.you-completed-personal-recovery')}
            buttonText={t('words.okay')}
            // TODO: if there are no registered devices, do we assume this seed was never used in Fedi and go straight to JoinFederation
            nextScreen={
                registeredDevices.length > 0
                    ? 'RecoveryWalletOptions'
                    : 'JoinFederation'
            }
        />
    )
}

export default PersonalRecoverySuccess
