import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Camera, useCameraDevices } from 'react-native-vision-camera'
import { Button, Text } from '@rneui/themed'

import type { RootStackParamList } from '../Router'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'

export type Props = NativeStackScreenProps<RootStackParamList, 'Send'>

const Send: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const [invoice, setInvoice] = React.useState('')
    const [address, setAddress] = React.useState('')

    // first check if user has granted camera permissions
    useEffect(() => {
        const checkForPermissions = async () => {
            const status = await Camera.getCameraPermissionStatus()
            console.log('checkForPermissions: ', status)
            if (status === 'denied') {
                navigation.navigate('RequestCameraAccess')
            }

            await Camera.requestCameraPermission()
        }

        checkForPermissions()
    }, [navigation])

    // side effect to detect if invoice has been pasted or scanned
    useEffect(() => {
        if (invoice.length > 0) {
            // TODO: go to send confirm screen before calling payInvoice
            navigation.navigate('ConfirmSendLightning', {
                invoice,
            })
        }
        if (address.length > 0) {
            // TODO: go to send confirm screen before calling payInvoice
            navigation.navigate('ConfirmSendOnChain', {
                address,
            })
        }
    }, [invoice, address, navigation])

    function handleUserInput(input: string) {
        if (input.startsWith('lnbc')) {
            console.log('sending ln')
            setInvoice(input)
        } else if (input.startsWith('bcrt')) {
            console.log('sending btc')
            setAddress(input)
        } else {
            console.log('no invoice detected')
        }
    }

    const checkClipboard = async () => {
        // call fedimint-ffi here
        const text = await Clipboard.getString()
        handleUserInput(text)
    }

    const devices = useCameraDevices()
    const device = devices.back

    const renderQrCodeScanner = () => {
        if (device == null) {
            return <ActivityIndicator />
        } else {
            return (
                <QrCodeScanner
                    device={device}
                    onQrCodeDetected={(qrCodeData: string) => {
                        handleUserInput(qrCodeData)
                    }}
                />
            )
        }
    }

    return (
        <View style={styles.container}>
            <Text>{t('feature.send.scan-qr-code')}</Text>
            <View style={styles.cameraScannerContainer}>
                {renderQrCodeScanner()}
            </View>
            <Button
                title={t('feature.send.paste-lightning-request')}
                onPress={checkClipboard}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraScannerContainer: {
        height: '50%',
        width: '100%',
    },
})

export default Send
