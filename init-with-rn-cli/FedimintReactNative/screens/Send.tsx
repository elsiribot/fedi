import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
    ActivityIndicator,
    Button,
    NativeModules,
    View,
    Text,
    StyleSheet,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import Clipboard from '@react-native-clipboard/clipboard'
import Camera from 'react-native-vision-camera'

import type { RootStackParamList } from '../App'

const {
    FedimintFfi: { payInvoice },
} = NativeModules

export type Props = NativeStackScreenProps<RootStackParamList, 'Send'>

// const CameraScanner = () => {
//     const devices = Camera.useCameraDevices()
//     const device = devices.back

//     if (device == null) return <ActivityIndicator />

//     return <Camera style={styles.camera} device={device} />
// }

const Send: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const [invoice, setInvoice] = React.useState('')

    const checkClipboard = async () => {
        // call fedimint-ffi here
        const text = await Clipboard.getString()

        if (text.startsWith('lnbc')) {
            setInvoice(text)
        } else {
            console.log('no invoice detected')
        }
        // const result = callFedimintFfi('payinvoice', invoice)
    }

    useEffect(() => {
        if (invoice.length > 0) {
            // go to send confirm screen to pay invoice
            payInvoice(invoice)
        }
    }, [invoice])

    useEffect(() => {
        const checkForPermissions = async () => {
            // const cameraPermission = await Camera.getCameraPermissionStatus()
            // console.log(cameraPermission)
            console.log(Camera)
        }

        checkForPermissions()
    }, [])

    return (
        <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text>{`Scan a Lightning QR code`}</Text>
            <View style={styles.cameraScannerContainer}>
                {/* <CameraScanner /> */}
            </View>
            <Button title="Paste Lightning request" onPress={checkClipboard} />
        </View>
    )
}

const styles = StyleSheet.create({
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
