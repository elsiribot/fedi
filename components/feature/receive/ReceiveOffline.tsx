import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button } from '@rneui/themed'
import React, { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Camera, useCameraDevices } from 'react-native-vision-camera'
import { useBridge } from '../../../contexts/FederationsContext'
import { RootStackParamList } from '../../../Router'

import AnimatedQrCodeScanner from '../scan/AnimatedQrCodeScanner'

export type Props = NativeStackScreenProps<RootStackParamList, 'ReceiveOffline'>

const ReceiveOffline: React.FC<Props> = () => {
    const { receiveEcash } = useBridge()
    const navigation = useNavigation()
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

    const devices = useCameraDevices()
    const device = devices.back

    const renderQrCodeScanner = () => {
        if (device == null) {
            return <ActivityIndicator />
        } else {
            return (
                <AnimatedQrCodeScanner
                    device={device}
                    onQrCodeDetected={onResult}
                />
            )
        }
    }

    const onResult = async (notes: string) => {
        await receiveEcash(notes)
        navigation.navigate('Home')
    }

    return (
        <View style={styles.container}>
            <View style={styles.cameraScannerContainer}>
                {renderQrCodeScanner()}
            </View>
            <Button title={'foobar'} onPress={() => {}} />
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

export default ReceiveOffline
