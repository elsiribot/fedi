import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useCameraDevices } from 'react-native-vision-camera'
import { joinFederation, listFederations } from '../bridge'

import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import {
    updateFederations,
    useFederationsContext,
} from '../state/contexts/FederationsContext'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ScanFederationCode'
>

const ScanFederationCode: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { state, dispatch } = useFederationsContext()
    const { toast } = useEnvironmentContext().state
    const [joiningFederation, setJoiningFederation] = useState<string>('')

    useEffect(() => {
        const handleJoinFederation = async () => {
            try {
                const federation = await joinFederation(joiningFederation)
                const federations = await listFederations()
                if (federations.length > 0) {
                    dispatch(updateFederations(federation.name, federations))
                }
            } catch (e) {
                console.error(e)
                toast?.show(t('errors.failed-to-join-federation'), 5000)
            }
            setJoiningFederation('')
        }

        if (joiningFederation) {
            handleJoinFederation()
        }
    }, [dispatch, joiningFederation, t, toast])

    useEffect(() => {
        if (joiningFederation === '' && state.selectedFederation) {
            navigation.replace('FederationWelcome')
        }
    }, [navigation, state.selectedFederation, joiningFederation])

    const handleUserInput = useCallback(
        async (input: string) => {
            if (input.startsWith('{"members":')) {
                console.info('fedi qr code detected', input)
                // Set the federation string to trigger the useEffect above
                setJoiningFederation(input)
            } else {
                toast?.show(t('errors.invalid-federation-code'), 5000)
            }
        },
        [t, toast],
    )

    const checkClipboard = useCallback(async () => {
        const text = await Clipboard.getString()
        handleUserInput(text)
    }, [handleUserInput])

    const devices = useCameraDevices()
    const device = devices.back

    const renderQrCodeScanner = () => {
        if (device == null || joiningFederation !== '') {
            return <ActivityIndicator />
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
                    title={t(
                        'feature.federations.paste-federation-code-instead',
                    )}
                    onPress={checkClipboard}
                    disabled={joiningFederation !== ''}
                    loading={joiningFederation !== ''}
                    type="clear"
                />
            }
            message={t('feature.federations.camera-access-information')}>
            <View style={styles(theme).container}>
                <View style={styles(theme).cameraScannerContainer}>
                    {renderQrCodeScanner()}
                </View>
                <View style={styles(theme).buttonContainer}>
                    <Button
                        disabled={joiningFederation !== ''}
                        loading={joiningFederation !== ''}
                        title={t('feature.federations.paste-federation-code')}
                        onPress={checkClipboard}
                        fullWidth
                    />
                </View>
            </View>
        </CameraPermissionsRequired>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        cameraScannerContainer: {
            height: '80%',
            width: '100%',
            margin: theme.spacing.lg,
        },
        buttonContainer: {
            width: '100%',
            paddingHorizontal: theme.spacing.lg,
        },
    })

export default ScanFederationCode
