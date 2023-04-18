import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import { t } from 'i18next'
import { dataToFrames } from 'qrloop'
import React, { useEffect, useMemo, useState } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import amountUtils from '@fedi/common/utils/AmountUtils'

import { Images } from '../assets/images'
import FiatAmount from '../components/feature/wallet/FiatAmount'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'SendOfflineQr'>

const SendOfflineQr: React.FC<Props> = ({ navigation, route }: Props) => {
    const { theme } = useTheme()
    const { ecash, amount } = route.params
    const qrCodeSize = Dimensions.get('window').width * 0.8
    const [index, setIndex] = useState(0)
    const [unit] = useState('sats')

    const frames = useMemo(() => dataToFrames(ecash), [ecash])

    // show new qr every 100ms
    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((index + 1) % frames.length)
        }, 100)
        return () => clearInterval(interval)
    }, [index, frames])

    const amountSats = amountUtils.msatToSat(amount)

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).amountContainer}>
                <Text h2>{`${amountUtils.formatNumber(amountSats)} `}</Text>
                <Text>{`${t('words.sats').toUpperCase()}`}</Text>
            </View>

            <FiatAmount amountSats={amountSats} />
            <View style={styles(theme).qrContainer}>
                <QRCode
                    value={frames[index]}
                    size={qrCodeSize}
                    logo={Images.FediQrLogo}
                />
            </View>
            <View style={styles(theme).actionContainer}>
                <Text small style={styles(theme).instructionsText}>
                    {`${t('phrases.hold-to-confirm')}`}
                </Text>
                <Button
                    fullWidth
                    title={t('feature.send.i-have-sent-payment')}
                    onLongPress={() => {
                        navigation.navigate('SendSuccess', {
                            amount,
                            unit,
                        })
                    }}
                    delayLongPress={500}
                    containerStyle={styles(theme).buttonContainer}
                />
            </View>
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
        actionContainer: {
            marginTop: 'auto',
            width: '100%',
        },
        amountContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        instructionsText: {
            textAlign: 'center',
            marginVertical: theme.spacing.md,
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
