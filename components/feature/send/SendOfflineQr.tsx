import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { Images } from '../../../assets/images'
import { dataToFrames } from 'qrloop'

import type { RootStackParamList } from '../../../Router'
import { Camera } from 'react-native-vision-camera'
import SendConfirmationModal from './SendConfirmationModal'

export type Props = NativeStackScreenProps<RootStackParamList, 'SendOfflineQr'>

const SendOfflineQr: React.FC<Props> = ({ route }: Props) => {
    const { theme } = useTheme()
    const { ecash, amount } = route.params
    const qrCodeSize = Dimensions.get('window').width * 0.8
    const [index, setIndex] = useState(0)
    const navigation = useNavigation()
    const [showModal, setShowModal] = useState(false)
    const [unit] = useState('sats')

    const frames = dataToFrames(ecash)

    useEffect(() => {
        const checkForPermissions = async () => {
            const status = await Camera.getCameraPermissionStatus()
            console.log('checkForPermissions: ', status)
            if (status === 'denied') {
                navigation.navigate('RequestCameraAccess', {
                    nextScreen: 'SendOfflineQr',
                })
            }
        }

        checkForPermissions()
    }, [navigation])

    // show new qr every 100ms
    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((index + 1) % frames.length)
        }, 100)
        return () => clearInterval(interval)
    }, [index, frames])

    return (
        <View style={styles(theme).container}>
            <QRCode
                value={frames[index]}
                size={qrCodeSize}
                logo={Images.FediQrLogo}
            />
            <Button title={'done'} onPress={() => setShowModal(true)} />
            <SendConfirmationModal
                visible={showModal}
                amount={amount}
                unit={unit}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        modalContent: {
            backgroundColor: theme.colors.secondary,
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        },
        modalText: {
            color: theme.colors.primary,
            fontSize: 30,
            margin: 10,
        },
        buttonContainer: {
            width: '90%',
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            margin: 10,
        },
    })

export default SendOfflineQr
