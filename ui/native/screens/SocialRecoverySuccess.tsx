import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import {
    connectChat,
    selectAuthenticatedMember,
    selectChatConnectionOptions,
} from '@fedi/common/redux'

import { fedimint } from '../bridge'
import Success from '../components/ui/Success'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'SocialRecoverySuccess'
>

const SocialRecoverySuccess: React.FC<Props> = () => {
    const { t } = useTranslation()
    const connectionOptions = useAppSelector(selectChatConnectionOptions)
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)
    const { activeFederationId } = useAppSelector(s => s.federation)
    const dispatch = useAppDispatch()

    useEffect(() => {
        const handleConnectChat = async () => {
            try {
                if (!activeFederationId) return
                await dispatch(
                    connectChat({
                        fedimint,
                        federationId: activeFederationId,
                    }),
                )
            } catch (error) {
                console.error(error)
            }
        }
        if (connectionOptions && authenticatedMember) {
            handleConnectChat()
        }
    }, [activeFederationId, authenticatedMember, connectionOptions, dispatch])

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
