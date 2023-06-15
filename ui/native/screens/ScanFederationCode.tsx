import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCameraDevices } from 'react-native-vision-camera'

import { joinFederation } from '@fedi/common/redux'
import { formatErrorMessage } from '@fedi/common/utils/format'

import { fedimint } from '../bridge'
import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppDispatch } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ScanFederationCode'
>

const ScanFederationCode: React.FC<Props> = ({ navigation }: Props) => {
    const insets = useSafeAreaInsets()
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state
    const dispatch = useAppDispatch()
    const [isJoining, setIsJoining] = useState<boolean>(false)

    const handleUserInput = useCallback(
        async (input: string) => {
            // TODO: Remove this and leave all code validation to
            // the bridge?
            if (input.startsWith('fed1')) {
                console.info('fedi qr code detected', input)
                setIsJoining(true)
                try {
                    await dispatch(
                        joinFederation({ fedimint, code: input }),
                    ).unwrap()
                    navigation.replace('FederationWelcome')
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
                        typedError?.message?.includes(
                            'No record locks available',
                        )
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
                }
                setIsJoining(false)
            } else {
                toast?.show(t('errors.invalid-federation-code'), 5000)
            }
        },
        [dispatch, navigation, t, toast],
    )

    const checkClipboard = useCallback(async () => {
        const text = await Clipboard.getString()
        handleUserInput(text.trim())
    }, [handleUserInput])

    const devices = useCameraDevices()
    const device = devices.back

    const renderQrCodeScanner = () => {
        if (device == null) {
            return <ActivityIndicator />
        } else if (isJoining) {
            return null
        } else {
            return (
                <QrCodeScanner
                    device={device}
                    onQrCodeDetected={handleUserInput}
                />
            )
        }
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
                    disabled={isJoining}
                    loading={isJoining}
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
                        disabled={isJoining}
                        loading={isJoining}
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

export default ScanFederationCode
