import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'
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
    const insets = useSafeAreaInsets()
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { addressOrInvoice } = useBridge()
    const { toast } = useEnvironmentContext().state
    const [inputToProcess, setInputToProcess] = useState<string>('')
    const [paymentRequestUri, setPaymentRequestUri] = useState<BtcLnUri | null>(
        null,
    )

    const handleUserInput = (input: string) => {
        setInputToProcess(input)
    }

    const checkClipboard = async () => {
        const text = await Clipboard.getString()
        handleUserInput(text.trim())
    }

    useEffect(() => {
        const processInput = async () => {
            const normalized = normalizePaymentRequest(inputToProcess)
            try {
                let result = await addressOrInvoice(normalized.body)
                if (result === AddressOrInvoice.address) {
                    // Temporarily disable on-chain spends
                    // normalized.type = BitcoinOrLightning.bitcoin
                    // setPaymentRequestUri(normalized)
                    toast?.show('On-chain sends temporarily disabled', 3000)
                }
                if (result === AddressOrInvoice.invoice) {
                    normalized.type = BitcoinOrLightning.lightning
                    setPaymentRequestUri(normalized)
                }
            } catch (error) {
                let typedError = error as Error
                toast?.show(typedError.message, 3000)
            }
            setInputToProcess('')
        }
        if (inputToProcess) {
            processInput()
        }
    }, [addressOrInvoice, inputToProcess, toast])

    // detect if invoice or address has been pasted or scanned
    useEffect(() => {
        if (paymentRequestUri?.body) {
            if (paymentRequestUri?.type === BitcoinOrLightning.lightning) {
                navigation.navigate('ConfirmSendLightning', {
                    lightningUri: paymentRequestUri,
                })
            }
            if (paymentRequestUri?.type === BitcoinOrLightning.bitcoin) {
                navigation.navigate('ConfirmSendOnChain', {
                    bitcoinUri: paymentRequestUri,
                })
            }
        }
    }, [paymentRequestUri, navigation])

    const devices = useCameraDevices()
    const device = devices.back

    const renderQrCodeScanner = () => {
        if (device == null) {
            return <ActivityIndicator />
        } else if (inputToProcess !== '') {
            return null
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
            message={t('feature.send.camera-access-information')}>
            <View style={styles(theme, insets).container}>
                <View style={styles(theme, insets).cameraScannerContainer}>
                    {renderQrCodeScanner()}
                </View>

                <View style={styles(theme, insets).buttonsContainer}>
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
                        loading={inputToProcess !== ''}
                        containerStyle={styles(theme, insets).bottomButton}
                    />
                </View>
            </View>
        </CameraPermissionsRequired>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: theme.spacing.lg,
        },
        // flex: 0 takes only the space it needs to render the buttons while
        // flex: 1 makes sure to take the remaining available space
        cameraScannerContainer: {
            flex: 1,
            width: '100%',
        },
        buttonsContainer: {
            flex: 0,
            justifyContent: 'flex-end',
            paddingHorizontal: theme.spacing.xl,
            width: '100%',
            marginTop: theme.spacing.xl,
            marginBottom: theme.spacing.xl + insets.bottom,
        },
        // adds space between the 2 buttons
        bottomButton: {
            marginTop: theme.spacing.lg,
        },
    })

export default Send
