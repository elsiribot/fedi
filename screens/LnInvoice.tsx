import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Text, Share, StyleSheet, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import QRCode from 'react-native-qrcode-svg'

import type { RootStackParamList } from '../Router'

export type Props = NativeStackScreenProps<RootStackParamList, 'LnInvoice'>

const LnInvoice: React.FC<Props> = ({ route }: Props) => {
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
