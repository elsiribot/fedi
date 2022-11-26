import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text } from '@rneui/themed'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Share, StyleSheet, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { ReceivedLightningEvent, TFedimintEventEmitter } from '../bridge'
import type { RootStackParamList } from '../Router'

export type Props = NativeStackScreenProps<RootStackParamList, 'LnInvoice'>

const LnInvoice: React.FC<Props> = ({ route, navigation }: Props) => {
    const { t } = useTranslation()
    const { invoice } = route.params

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

    return (
        <View style={styles.container}>
            <QRCode value={invoice} size={300} />
            <Text>{invoice}</Text>
            <View style={styles.buttonsContainer}>
                <Button title={t('words.share')} onPress={openShareDialog} />
                <Button title={t('words.copy')} onPress={copyToClipboard} />
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
        justifyContent: 'space-evenly',
    },
})

export default LnInvoice
