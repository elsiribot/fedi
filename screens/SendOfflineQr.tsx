import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { Dimensions, Pressable, StyleSheet, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { dataToFrames } from 'qrloop'

import { Images } from '../assets/images'

import type { RootStackParamList } from '../types/navigation'
import SendConfirmationModal from '../components/feature/send/SendConfirmationModal'
import { t } from 'i18next'
import amountUtils from '../utils/AmountUtils'

export type Props = NativeStackScreenProps<RootStackParamList, 'SendOfflineQr'>

const SendOfflineQr: React.FC<Props> = ({ route }: Props) => {
    const { theme } = useTheme()
    const { ecash, amount } = route.params
    const qrCodeSize = Dimensions.get('window').width * 0.8
    const [index, setIndex] = useState(0)
    const [showModal, setShowModal] = useState(false)
    const [unit] = useState('sats')

    const frames = dataToFrames(ecash)

    // show new qr every 100ms
    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((index + 1) % frames.length)
        }, 100)
        return () => clearInterval(interval)
    }, [index, frames])

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).amountContainer}>
                <Text h2>{`${amountUtils.millisToSats(amount)} `}</Text>
                <Text>{`${t('words.sats').toUpperCase()}`}</Text>
            </View>
            <View style={styles(theme).qrContainer}>
                <QRCode
                    value={frames[index]}
                    size={qrCodeSize}
                    logo={Images.FediQrLogo}
                />
            </View>
            <Button
                fullWidth
                title={t('feature.send.i-have-sent-payment')}
                onLongPress={() => setShowModal(true)}
                delayLongPress={500}
                containerStyle={styles(theme).buttonContainer}
            />
            <SendConfirmationModal
                visible={showModal}
                amount={amountUtils.millisToSats(amount)}
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
            padding: theme.spacing.xl,
        },
        amountContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        qrContainer: {
            marginTop: 'auto',
        },
        buttonContainer: {
            marginTop: 'auto',
            marginVertical: theme.spacing.xl,
        },
    })

export default SendOfflineQr
