import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Card, Text } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    ActivityIndicator,
    Dimensions,
    Share,
    StyleSheet,
    View,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { Images } from '../assets/images'

import {
    decodeInvoice,
    Invoice,
    TransactionEvent,
    TFedimintEventEmitter,
} from '../bridge'
import type { RootStackParamList } from '../types/navigation'
import stringUtils from '../utils/StringUtils'
import amountUtils from '../utils/AmountUtils'

export type Props = NativeStackScreenProps<RootStackParamList, 'LnInvoice'>

const LnInvoice: React.FC<Props> = ({ route, navigation }: Props) => {
    const { t } = useTranslation()
    const { invoice } = route.params
    const [decodedInvoice, setDecodedInvoice] = useState<Invoice>({
        paymentHash: '',
        amount: 0,
        description: '',
        invoice: invoice,
        fee: null,
    })

    const copyToClipboard = () => {
        Clipboard.setString(decodedInvoice.invoice)
    }

    const openShareDialog = async () => {
        // open share dialog
        try {
            const result = await Share.share({
                message: decodedInvoice.invoice,
            })
            console.log(result)
            if (result.action === Share.sharedAction) {
                if (result.activityType) {
                    // shared with activity type of result.activityType
                    console.log(result.activityType)
                } else {
                    // shared
                    console.log(result)
                }
            } else if (result.action === Share.dismissedAction) {
                // dismissed
                console.log('share dialog dismissed')
            }
        } catch (error) {
            console.error(error)
        }
    }

    // Decodes the invoice passed as params
    useEffect(() => {
        const _decodeInvoice = async () => {
            const decoded = await decodeInvoice(invoice)
            console.log('decoded invoice', decoded)
            setDecodedInvoice(decoded)
        }

        _decodeInvoice()
    }, [invoice])

    const transactionEventHandler = useCallback(
        (event: TransactionEvent) => {
            if (event.transaction.lightning?.invoice === decodedInvoice.invoice)
                navigation.navigate('ReceiveSuccess', {
                    tx: {
                        type: 'lightning',
                        amount: decodedInvoice.amount,
                    },
                })
        },
        [navigation, decodedInvoice],
    )

    // Registers an event handler listening for the invoice to be paid
    useEffect(() => {
        const emitter = new TFedimintEventEmitter()
        emitter.onTransaction(transactionEventHandler)
    }, [transactionEventHandler])

    const qrCodeSize = Dimensions.get('window').width * 0.8

    if (decodedInvoice.amount === 0) {
        return <ActivityIndicator />
    }

    return (
        <View style={styles.container}>
            <Text h2>{`${amountUtils.millisToSats(decodedInvoice.amount)} ${t(
                'words.sats',
            )}`}</Text>
            <Card containerStyle={styles.roundedCardContainer}>
                <QRCode
                    value={decodedInvoice.invoice}
                    size={qrCodeSize}
                    logo={Images.FediQrLogo}
                />
                <View style={styles.invoiceTextContainer}>
                    <Text style={styles.invoiceTitle}>
                        {t('phrases.lightning-request')}
                    </Text>
                    <Text style={styles.invoiceString} numberOfLines={1}>
                        {stringUtils.truncateMiddleOfString(
                            decodedInvoice.invoice,
                            6,
                        )}
                    </Text>
                </View>
            </Card>
            <View style={styles.buttonsContainer}>
                <Button
                    title={t('words.share')}
                    onPress={openShareDialog}
                    containerStyle={styles.button}
                />
                <Button
                    title={t('words.copy')}
                    onPress={copyToClipboard}
                    containerStyle={styles.button}
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonsContainer: {
        width: '90%',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        width: '48%',
        marginVertical: 16,
    },
    invoiceTextContainer: {
        flexDirection: 'row',
        width: '100%',
        marginTop: 16,
        marginBottom: 8,
    },
    invoiceTitle: {
        flex: 1,
    },
    invoiceString: {
        flex: 1,
        textAlign: 'right',
    },
    roundedCardContainer: {
        borderRadius: 20,
        width: '90%',
    },
})

export default LnInvoice
