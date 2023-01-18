import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native'
import { useCameraDevices } from 'react-native-vision-camera'

import { joinFederation, listFederations } from '../bridge'
import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import {
    changeSelectedFederation,
    updateConnectedFederations,
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
    const { dispatch } = useFederationsContext()
    const { toast } = useEnvironmentContext().state
    const [joiningFederation, setJoiningFederation] = useState<boolean>(false)
    const [scannerProcessing, setScannerProcessing] = useState<boolean>(false)

    const handleUserInput = useCallback(
        async (input: string) => {
            // tmuxinator
            if (Platform.OS === 'android') {
                // input =
                //     '{"members":[[0,"ws://10.0.2.2:4001/"],[1,"ws://10.0.2.2:4011/"],[2,"ws://10.0.2.2:4021/"],[3,"ws://10.0.2.2:4031/"]]}'
                input =
                    '{"members":[[0,"wss://4c0922043ed1.ngrok.io"],[1,"wss://6fc418b1717c.ngrok.io"],[2,"wss://141bc9ab1e05.ngrok.io"],[3,"wss://d8589c2dac84.ngrok.io/"]]}'
            }
            console.log('input', input)
            // Provide a 500ms delay to throttle input from the scanner
            setScannerProcessing(true)
            setTimeout(() => setScannerProcessing(false), 500)

            if (input.startsWith('{"members":')) {
                console.log('fedi qr code detected', input)

                if (joiningFederation === true) return

                try {
                    setJoiningFederation(true)
                    var federation = await joinFederation(input)
                } catch (e) {
                    console.error('Failed to join federation', e)
                    setJoiningFederation(false)
                    return
                }
                const federations = await listFederations()
                if (federations.length > 0) {
                    dispatch(updateConnectedFederations(federations))
                    dispatch(changeSelectedFederation(federation))
                    setJoiningFederation(false)
                    navigation.navigate('Home')
                }
            } else {
                toast?.show('invalid federation code', 5000)
            }
        },
        [dispatch, joiningFederation, navigation, toast],
    )

    const checkClipboard = useCallback(async () => {
        const text = await Clipboard.getString()
        handleUserInput(text)
    }, [handleUserInput])

    const devices = useCameraDevices()
    const device = devices.back

    const renderQrCodeScanner = () => {
        if (device == null || joiningFederation === true) {
            return <ActivityIndicator />
        } else {
            return (
                <QrCodeScanner
                    device={device}
                    onQrCodeDetected={(qrCodeData: string) => {
                        if (scannerProcessing) return
                        handleUserInput(qrCodeData)
                    }}
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
                    type="clear"
                />
            }
            message={t('feature.federations.camera-access-information')}>
            <View style={styles(theme).container}>
                <View style={styles(theme).cameraScannerContainer}>
                    {renderQrCodeScanner()}
                </View>
                <Button
                    title={t('feature.federations.paste-federation-code')}
                    onPress={checkClipboard}
                />
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
    })

export default ScanFederationCode
