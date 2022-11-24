import Clipboard from '@react-native-clipboard/clipboard'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    ActivityIndicator,
    Dimensions,
    NativeModules,
    Share,
    StyleSheet,
    View,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { Button, Card, Text } from '@rneui/themed'

import { truncateMiddleOfString } from '../scripts/utils'

const {
    FedimintFfi: { generateAddress },
} = NativeModules

const ReceiveOnchain: React.FC<{}> = () => {
    const { t } = useTranslation()
    const [address, setAddress] = useState<string>('')

    useEffect(() => {
        const generateOnchainAddress = async () => {
            const newAddress = await generateAddress()

            setAddress(newAddress)
        }

        generateOnchainAddress()
    }, [])

    const copyToClipboard = () => {
        Clipboard.setString(address)
    }

    const openShareDialog = async () => {
        // open share dialog
        try {
            const result = await Share.share({
                message: address,
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

    const qrCodeSize = Dimensions.get('window').width * 0.8

    return (
        <View style={styles.container}>
            <Card containerStyle={styles.roundedCardContainer}>
                <Text>{t('words.important').toUpperCase()}!</Text>
                <Text>{t('feature.receive.onchain-notice')}</Text>
            </Card>
            {address ? (
                <>
                    <Card containerStyle={styles.roundedCardContainer}>
                        <QRCode value={address} size={qrCodeSize} />
                        <View style={styles.addressTextContainer}>
                            <Text style={styles.addressTitle}>
                                {t('phrases.bitcoin-address')}
                            </Text>
                            <Text
                                style={styles.addressString}
                                numberOfLines={1}>
                                {truncateMiddleOfString(address, 6)}
                            </Text>
                        </View>
                    </Card>
                    <View style={styles.buttonsContainer}>
                        <Button
                            title={t('words.share')}
                            onPress={openShareDialog}
                        />
                        <Button
                            title={t('words.copy')}
                            onPress={copyToClipboard}
                        />
                    </View>
                </>
            ) : (
                <ActivityIndicator />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
    },
    addressTextContainer: {
        flexDirection: 'row',
        width: '100%',
        marginTop: 16,
        marginBottom: 8,
    },
    addressTitle: {
        flex: 1,
    },
    addressString: {
        flex: 1,
        textAlign: 'right',
    },
    buttonsContainer: {
        width: '90%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        margin: 50,
    },
    roundedCardContainer: {
        borderRadius: 20,
        width: '90%',
    },
})

export default ReceiveOnchain
