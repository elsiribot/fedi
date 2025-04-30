import { useNavigation } from '@react-navigation/native'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator } from 'react-native'

import { useFederationPreview } from '@fedi/common/hooks/federation'
import { selectFederations } from '@fedi/common/redux'

import { fedimint } from '../../../bridge'
import { useAppSelector } from '../../../state/hooks'
import CustomOverlay from '../../ui/CustomOverlay'
import FederationPreview from '../onboarding/FederationPreview'

type Props = {
    inviteCode: string
    children: React.ReactNode
    fallbackContent?: React.ReactNode
}

export default function FederationGate({
    inviteCode,
    children,
    fallbackContent,
}: Props) {
    const [isJoining, setIsJoining] = useState(true)
    const federations = useAppSelector(selectFederations)
    const navigation = useNavigation()
    const { t } = useTranslation()
    const { isFetchingPreview, federationPreview, handleCode, handleJoin } =
        useFederationPreview(t, fedimint, '')

    const handleBack = () => {
        if (navigation.canGoBack()) navigation.goBack()
    }

    const foundFederation = federations.find(f => {
        if (f.init_state === 'ready') return f.inviteCode === inviteCode

        return false
    })

    useEffect(() => {
        if (foundFederation) return

        handleCode(inviteCode)
    }, [foundFederation, inviteCode, handleCode])

    if (foundFederation) return children

    return (
        <>
            {fallbackContent}
            <CustomOverlay
                show={isJoining}
                onBackdropPress={handleBack}
                contents={{
                    title: t('feature.federations.join-federation'),
                    body:
                        isFetchingPreview || !federationPreview ? (
                            <ActivityIndicator />
                        ) : (
                            <FederationPreview
                                federation={federationPreview}
                                onJoin={() =>
                                    handleJoin(() => setIsJoining(false))
                                }
                                onBack={handleBack}
                            />
                        ),
                }}
            />
        </>
    )
}
