import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Card, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, Share, StyleSheet, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { Images } from '../assets/images'

import { ReceivedLightningEvent, TFedimintEventEmitter } from '../bridge'
import type { RootStackParamList } from '../Router'
import InvoiceUtils from '../utils/InvoiceUtils'
import stringUtils from '../utils/StringUtils'

export type Props = NativeStackScreenProps<RootStackParamList, 'LnInvoice'>

const LnInvoice: React.FC<Props> = ({ route, navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { invoice } = route.params
    const [amount] = useState(InvoiceUtils.getAmountFromInvoice(invoice))

    const copyToClipboard = () => {
        Clipboard.setString(invoice)
    }

    const openShareDialog = async () => {
        // open share dialog
        try {
            const result = await Share.share({
                message: invoice,
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

    useEffect(() => {
        const receivedLightningHandler = (event: ReceivedLightningEvent) => {
            console.log(`"receivedLightning" -> "${event.paymentHash}"`)
            // TODO: check paymentHash against invoice
            if (event.paymentHash) {
                // TODO: get amount from invoice
                navigation.navigate('LnReceiveSuccess', {
                    amountReceived: '615000',
                })
            }
        }

        const emitter = new TFedimintEventEmitter()
        emitter.onReceivedLightning(receivedLightningHandler)
    }, [navigation])

    const qrCodeSize = Dimensions.get('window').width * 0.8

    return (
        <View style={styles.container}>
            <Text h2>{`${amount} ${t('words.sats')}`}</Text>
            <Card containerStyle={styles.roundedCardContainer}>
                <QRCode
                    value={invoice}
                    size={qrCodeSize}
                    logo={Images.FediQrLogo}
                />
                <View style={styles.invoiceTextContainer}>
                    <Text style={styles.invoiceTitle}>
                        {t('phrases.lightning-request')}
                    </Text>
                    <Text style={styles.invoiceString} numberOfLines={1}>
                        {stringUtils.truncateMiddleOfString(invoice, 6)}
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
        // flex: 1,
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
