import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useCameraDevices } from 'react-native-vision-camera'

import { AddressOrInvoice } from '../bridge'
import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useBridge } from '../state/hooks'
import { BitcoinOrLightning, BtcLnUri } from '../types'
import type { RootStackParamList } from '../types/navigation'
import { normalizePaymentRequest } from '../utils/UriUtils'

export type Props = NativeStackScreenProps<RootStackParamList, 'Send'>

const Send: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { addressOrInvoice } = useBridge()
    const { toast } = useEnvironmentContext().state
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [paymentRequestUri, setPaymentRequestUri] = useState<BtcLnUri | null>(
        null,
    )

    const handleUserInput = useCallback(
        async (input: string) => {
            if (isLoading) return
            console.info('input', input)
            setIsLoading(true)
            const normalized = normalizePaymentRequest(input)
            try {
                console.info('normalized', normalized)
                let result = await addressOrInvoice(normalized.body)
                console.info('result', result)
                if (result === AddressOrInvoice.address) {
                    normalized.type = BitcoinOrLightning.bitcoin
                    setPaymentRequestUri(normalized)
                }
                if (result === AddressOrInvoice.invoice) {
                    normalized.type = BitcoinOrLightning.lightning
                    setPaymentRequestUri(normalized)
                }
            } catch (error) {
                let typedError = error as Error
                toast?.show(typedError.message, 3000)
            }
            setIsLoading(false)
        },
        [toast, addressOrInvoice, isLoading],
    )

    const checkClipboard = useCallback(async () => {
        const text = await Clipboard.getString()
        handleUserInput(text.trim())
    }, [handleUserInput])

    // detect if invoice or address has been pasted or scanned
    useEffect(() => {
        console.log('useEffect')
        if (!paymentRequestUri?.body) return

        if (paymentRequestUri?.type === BitcoinOrLightning.lightning) {
            console.log(paymentRequestUri)
            navigation.navigate('ConfirmSendLightning', {
                lightningUri: paymentRequestUri,
            })
        }
        if (paymentRequestUri?.type === BitcoinOrLightning.bitcoin) {
            navigation.navigate('ConfirmSendOnChain', {
                bitcoinUri: paymentRequestUri,
            })
        }
    }, [paymentRequestUri, navigation])

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
        <CameraPermissionsRequired
            alternativeActionButton={
                <Button
                    title={t('feature.send.paste-payment-request-instead')}
                    onPress={checkClipboard}
                    type="clear"
                    titleStyle={styles(theme).titleButton}
                />
            }
            message={t('feature.send.camera-access-information')}>
            <View style={styles(theme).container}>
                <View style={styles(theme).cameraScannerContainer}>
                    {renderQrCodeScanner()}
                </View>

                <View style={styles(theme).buttonsContainer}>
                    <Button
                        fullWidth
                        type="clear"
                        title={t('feature.send.send-to-offline-user')}
                        onPress={() => navigation.navigate('SendOfflineAmount')}
                        titleStyle={styles(theme).titleButton}
                    />
                    <Button
                        fullWidth
                        title={t('feature.send.paste-payment-request')}
                        onPress={checkClipboard}
                        titleStyle={styles(theme).titleButton}
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
            height: '75%',
            width: '100%',
            margin: theme.spacing.md,
        },
        buttonsContainer: {
            height: '25%',
            justifyContent: 'space-between',
            padding: theme.spacing.xl,
            width: '100%',
        },
        titleButton: {
            fontFamily: 'AlbertSans-Regular',
        },
    })

export default Send
