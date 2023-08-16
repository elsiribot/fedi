import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

// import { useCameraDevices } from 'react-native-vision-camera'
import { joinFederation } from '@fedi/common/redux'
import {
    getFederationPreview,
    getSupportedFeatures,
} from '@fedi/common/utils/FederationUtils'
import { formatErrorMessage } from '@fedi/common/utils/format'

import { fedimint } from '../bridge'
import FederationPreview from '../components/feature/onboarding/FederationPreview'
import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppDispatch } from '../state/hooks'
import {
    FederationPreview as FederationPreviewType,
    SupportedFeature,
} from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'JoinFederation'>

const JoinFederation: React.FC<Props> = ({ navigation, route }: Props) => {
    const insets = useSafeAreaInsets()
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state
    const dispatch = useAppDispatch()
    const [isFetchingPreview, setIsFetchingPreview] = useState(false)
    const [isJoining, setIsJoining] = useState<boolean>(false)
    const [federationPreview, setFederationPreview] =
        useState<FederationPreviewType>()

    const handleCode = useCallback(
        async (code: string) => {
            setIsFetchingPreview(true)
            try {
                const fed = await getFederationPreview(code)
                setFederationPreview(fed)
            } catch (err) {
                console.error(err)
                toast?.show(t('errors.invalid-federation-code'), 5000)
            }
            setIsFetchingPreview(false)
        },
        [t, toast],
    )

    // If they came here with route state, paste the code for them
    useEffect(() => {
        if (!route.params?.invite) return
        handleCode(route.params.invite)
    }, [route.params, handleCode])

    const goToNextScreen = useCallback(
        (joinAs: 'returningMember' | 'newMember') => {
            if (!federationPreview) return
            let nextScreen: keyof RootStackParamList = 'TabsNavigator'
            const isChatSupported = getSupportedFeatures(
                federationPreview.meta,
            ).includes(SupportedFeature.chat_server_domain)

            if (joinAs === 'returningMember') {
                nextScreen = 'ChooseRecoveryMethod'
            } else if (isChatSupported) {
                nextScreen = 'CreateUsername'
            }
            navigation.replace(nextScreen)
        },
        [federationPreview, navigation],
    )

    const handleJoin = useCallback(
        async (joinAs: 'returningMember' | 'newMember') => {
            setIsJoining(true)
            try {
                if (!federationPreview) throw new Error()

                await dispatch(
                    joinFederation({
                        fedimint,
                        code: federationPreview.connectionCode,
                    }),
                ).unwrap()
                goToNextScreen(joinAs)
            } catch (err) {
                // TODO: Expect an error code from bridge that maps to
                // a localized error message
                console.error(err)
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
                } else if (
                    typedError?.message === 'errors.you-have-already-joined'
                ) {
                    goToNextScreen(joinAs)
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

    const checkClipboard = useCallback(async () => {
        const text = await Clipboard.getString()
        handleCode(text.trim())
    }, [handleCode])

    // const devices = useCameraDevices()
    // const device = devices.back

    const renderQrCodeScanner = () => {
        // if (device == null) {
        //     return <ActivityIndicator />
        // } else if (isJoining) {
        if (isJoining || isFetchingPreview) {
            return <ActivityIndicator />
        } else {
            return (
                <QrCodeScanner
                    // device={device}
                    onQrCodeDetected={handleCode}
                />
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

    return (
        <CameraPermissionsRequired
            alternativeActionButton={
                <Button
                    testID="PasteWithoutCamPermissionButton"
                    title={t(
                        'feature.federations.paste-federation-code-instead',
                    )}
                    onPress={checkClipboard}
                    disabled={isJoining || isFetchingPreview}
                    loading={isJoining || isFetchingPreview}
                    type="clear"
                />
            }
            message={t('feature.federations.camera-access-information')}>
            <View style={styles(theme, insets).container}>
                <View style={styles(theme, insets).cameraScannerContainer}>
                    {renderQrCodeScanner()}
                </View>
                <View style={styles(theme, insets).buttonContainer}>
                    <Button
                        disabled={isJoining || isFetchingPreview}
                        loading={isJoining || isFetchingPreview}
                        title={t('feature.federations.paste-federation-code')}
                        onPress={checkClipboard}
                        fullWidth
                    />
                </View>
            </View>
        </CameraPermissionsRequired>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
        },
        cameraScannerContainer: {
            height: '80%',
            width: '100%',
            margin: theme.spacing.lg,
        },
        buttonContainer: {
            width: '100%',
            paddingHorizontal: theme.spacing.xl,
            marginTop: 'auto',
            marginBottom: theme.spacing.xl + insets.bottom,
        },
    })

export default JoinFederation
