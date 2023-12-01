import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useIsChatSupported } from '@fedi/common/hooks/federation'
import { joinFederation } from '@fedi/common/redux'
import { getFederationPreview } from '@fedi/common/utils/FederationUtils'
import { formatErrorMessage } from '@fedi/common/utils/format'
import { makeLog } from '@fedi/common/utils/log'

import { fedimint } from '../bridge'
import { OmniInput } from '../components/feature/omni/OmniInput'
import FederationPreview from '../components/feature/onboarding/FederationPreview'
import { CameraPermissionGate } from '../components/feature/permissions/CameraPermissionGate'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppDispatch } from '../state/hooks'
import {
    FederationPreview as FederationPreviewType,
    ParserDataType,
} from '../types'
import type { RootStackParamList } from '../types/navigation'

const log = makeLog('JoinFederation')

export type Props = NativeStackScreenProps<RootStackParamList, 'JoinFederation'>

const JoinFederation: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state
    const dispatch = useAppDispatch()
    const invite = route?.params?.invite
    const [isFetchingPreview, setIsFetchingPreview] = useState(!!invite)
    const [isJoining, setIsJoining] = useState<boolean>(false)
    const [federationPreview, setFederationPreview] =
        useState<FederationPreviewType>()
    const isChatSupported = useIsChatSupported(federationPreview)

    const handleCode = useCallback(
        async (code: string) => {
            setIsFetchingPreview(true)
            try {
                const fed = await getFederationPreview(code, fedimint)
                setFederationPreview(fed)
            } catch (err) {
                log.error('handleCode', err)
                toast?.show(
                    formatErrorMessage(
                        t,
                        err,
                        'errors.invalid-federation-code',
                    ),
                    5000,
                )
            }
            setIsFetchingPreview(false)
        },
        [t, toast],
    )

    // If they came here with route state, paste the code for them
    useEffect(() => {
        if (!invite) return
        handleCode(invite)
    }, [invite, handleCode])

    const goToNextScreen = useCallback(
        (joinAs: 'returningMember' | 'newMember') => {
            if (!federationPreview) return
            let nextScreen: keyof RootStackParamList = 'TabsNavigator'

            if (joinAs === 'returningMember') {
                nextScreen = 'ChooseRecoveryMethod'
            } else if (isChatSupported) {
                nextScreen = 'CreateUsername'
            }
            navigation.replace(nextScreen)
        },
        [federationPreview, isChatSupported, navigation],
    )

    const handleJoin = useCallback(
        async (joinAs: 'returningMember' | 'newMember') => {
            setIsJoining(true)
            try {
                if (!federationPreview) throw new Error()

                await dispatch(
                    joinFederation({
                        fedimint,
                        code: federationPreview.inviteCode,
                    }),
                ).unwrap()
                goToNextScreen(joinAs)
            } catch (err) {
                // TODO: Expect an error code from bridge that maps to
                // a localized error message
                log.error('handleJoin', err)
                const typedError = err as Error
                // This catches specific errors caused by:
                // 1. leaving a federation immediately before... After
                // force-quitting, joining again is successful so advise
                // the user here
                // 2. scanning a federation code after you already joined
                if (
                    typedError?.message?.includes('No record locks available')
                ) {
                    toast?.show(t('errors.please-force-quit-the-app'), 5000)
                } else {
                    toast?.show(
                        formatErrorMessage(
                            t,
                            typedError,
                            'errors.failed-to-join-federation',
                        ),
                        5000,
                    )
                }
                setIsJoining(false)
            }
        },
        [dispatch, federationPreview, goToNextScreen, t, toast],
    )

    const renderQrCodeScanner = () => {
        if (isJoining || isFetchingPreview) {
            return <ActivityIndicator />
        } else {
            return (
                <CameraPermissionGate>
                    <OmniInput
                        expectedInputTypes={[ParserDataType.FedimintInvite]}
                        onExpectedInput={input => handleCode(input.data.invite)}
                        onUnexpectedSuccess={() => null}
                        pasteLabel={t(
                            'feature.federations.paste-federation-code',
                        )}
                    />
                </CameraPermissionGate>
            )
        }
    }

    if (federationPreview) {
        return (
            <FederationPreview
                onJoin={handleJoin}
                federation={federationPreview}
            />
        )
    }

    return <View style={styles().container}>{renderQrCodeScanner()}</View>
}

const styles = () =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
    })

export default JoinFederation
