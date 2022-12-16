import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Camera, useCameraDevices } from 'react-native-vision-camera'
import { Button } from '@rneui/themed'

import type { RootStackParamList } from '../Router'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'
import { useBridge } from '../contexts/FederationsContext'
import { AddressOrInvoice } from '../bridge'

export type Props = NativeStackScreenProps<RootStackParamList, 'Send'>

const Send: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { addressOrInvoice } = useBridge()
    const [invoice, setInvoice] = React.useState('')
    const [address, setAddress] = React.useState('')

    // first check if user has granted camera permissions
    useEffect(() => {
        const checkForPermissions = async () => {
            const status = await Camera.getCameraPermissionStatus()
            console.log('checkForPermissions: ', status)
            if (status === 'denied') {
                navigation.navigate('RequestCameraAccess', {
                    nextScreen: 'Send',
                })
            }
        }

        checkForPermissions()
    }, [navigation])

    // detect if invoice or address has been pasted or scanned
    useEffect(() => {
        if (invoice.length > 0) {
            navigation.navigate('ConfirmSendLightning', {
                invoice,
            })
        }
        if (address.length > 0) {
            navigation.navigate('ConfirmSendOnChain', {
                address,
            })
        }
    }, [invoice, address, navigation])

    async function handleUserInput(input: string) {
        try {
            let result = await addressOrInvoice(input)
            if (result === AddressOrInvoice.address) {
                setAddress(input)
            }
            if (result === AddressOrInvoice.invoice) {
                setInvoice(input)
            }
        } catch (e) {
            // TODO: show this error
            console.error(e)
        }
    }

    const checkClipboard = async () => {
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
            <View style={styles.cameraScannerContainer}>
                {renderQrCodeScanner()}
            </View>
            <Button
                title={t('feature.send.send-to-offline-user')}
                onPress={() => navigation.navigate('SendOfflineAmount')}
            />
            <Button
                title={t('feature.send.paste-payment-request')}
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
        height: '80%',
        width: '100%',
        margin: 16,
    },
})

export default Send
