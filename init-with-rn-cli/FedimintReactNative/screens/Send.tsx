import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Button, View, Text, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import Clipboard from '@react-native-clipboard/clipboard'
import Camera from 'react-native-vision-camera'

import type { RootStackParamList } from '../App'

export type Props = NativeStackScreenProps<RootStackParamList, 'Send'>

const CameraScanner = () => {
    // const devices = Camera.useCameraDevices()
    // const device = devices.back

    return <ActivityIndicator />
    // if (device == null) return <ActivityIndicator />

    // return <Camera style={styles.camera} device={device} />
}

const Send: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const [invoice, setInvoice] = React.useState('')

    // first check if user has granted camera permissions
    useEffect(() => {
        const checkForPermissions = async () => {
            // TODO: request permission & handle navigation to update permissions page

            // const cameraPermission = await Camera.getCameraPermissionStatus()
            // console.log(cameraPermission)
            console.log(Camera)
        }

        checkForPermissions()
    }, [])

    // side effect to detect if invoice has been pasted or scanned
    useEffect(() => {
        if (invoice.length > 0) {
            // TODO: go to send confirm screen before calling payInvoice
            navigation.navigate('ConfirmSend', {
                invoice,
            })
        }
    }, [invoice, navigation])

    const checkClipboard = async () => {
        // call fedimint-ffi here
        const text = await Clipboard.getString()

        if (text.startsWith('lnbc')) {
            setInvoice(text)
        } else {
            console.log('no invoice detected')
        }
    }

    return (
        <View style={styles.container}>
            <Text>{t('feature.send.scan-qr-code')}</Text>
            <View style={styles.cameraScannerContainer}>
                <CameraScanner />
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
    camera: {
        height: '100%',
        width: '100%',
    },
})

export default Send
