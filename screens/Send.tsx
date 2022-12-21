import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useCameraDevices } from 'react-native-vision-camera'
import { Button, Theme, useTheme } from '@rneui/themed'

import type { RootStackParamList } from '../types/navigation'
import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'
import { useBridge } from '../contexts/FederationsContext'
import { AddressOrInvoice } from '../bridge'
import { normalizePaymentRequest } from '../utils/UriUtils'
import { BitcoinOrLightning, BtcLnUri } from '../types'

export type Props = NativeStackScreenProps<RootStackParamList, 'Send'>

const Send: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { addressOrInvoice } = useBridge()
    // const { toast } = useEnvironmentContext().state
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [paymentRequestUri, setPaymentRequestUri] = useState<BtcLnUri | null>(
        null,
    )

    const handleUserInput = useCallback(
        async (input: string) => {
            if (isLoading) return
            console.log('input', input)
            setIsLoading(true)
            const normalized = normalizePaymentRequest(input)
            console.log('normalized', normalized)
            try {
                let result = await addressOrInvoice(normalized.body)
                if (result === AddressOrInvoice.address) {
                    normalized.type = BitcoinOrLightning.bitcoin
                    setPaymentRequestUri(normalized)
                }
                if (result === AddressOrInvoice.invoice) {
                    normalized.type = BitcoinOrLightning.lightning
                    setPaymentRequestUri(normalized)
                }
            } catch (e: any) {
                // TODO: show this error
                console.error(e)
                // toast?.show('e', 5000)
            }
            setIsLoading(false)
        },
        [addressOrInvoice, isLoading],
    )

    const checkClipboard = useCallback(async () => {
        const text = await Clipboard.getString()
        handleUserInput(text)
    }, [handleUserInput])

    // detect if invoice or address has been pasted or scanned
    useEffect(() => {
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
                />
            }
            message={t('feature.send.camera-access-information')}
            nextScreen={'Send'}>
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
                    />
                    <Button
                        fullWidth
                        title={t('feature.send.paste-payment-request')}
                        onPress={checkClipboard}
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
    })

export default Send
