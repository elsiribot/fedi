import Clipboard from '@react-native-clipboard/clipboard'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Button, Card, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    ActivityIndicator,
    Dimensions,
    Share,
    StyleSheet,
    View,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { Images } from '../../../assets/images'

import { TransactionEvent, TFedimintEventEmitter } from '../../../bridge'
import { useBridge } from '../../../contexts/FederationsContext'
import { RootStackParamList } from '../../../types/navigation'
import stringUtils from '../../../utils/StringUtils'

type ReceiveOnchainNavigationProp =
    NativeStackNavigationProp<RootStackParamList>

const ReceiveOnchain: React.FC<{}> = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { generateAddress } = useBridge()
    const navigation = useNavigation<ReceiveOnchainNavigationProp>()
    const [address, setAddress] = useState<string>('')

    useEffect(() => {
        const generateOnchainAddress = async () => {
            const newAddress = await generateAddress()

            setAddress(newAddress)
        }

        generateOnchainAddress()
    }, [generateAddress])

    useEffect(() => {
        const transactionEventHandler = (event: TransactionEvent) => {
            if (event.transaction.bitcoin?.address === address) {
                navigation.navigate('ReceiveSuccess', {
                    tx: event.transaction,
                })
            }
        }

        const emitter = new TFedimintEventEmitter()
        emitter.onTransaction(transactionEventHandler)
    }, [navigation, address])

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
        <View style={styles(theme).container}>
            <Card containerStyle={styles(theme).roundedCardContainer}>
                <Text>{t('words.important').toUpperCase()}!</Text>
                <Text>{t('feature.receive.onchain-notice')}</Text>
            </Card>
            {address ? (
                <>
                    <Card containerStyle={styles(theme).roundedCardContainer}>
                        <QRCode
                            value={address}
                            size={qrCodeSize}
                            logo={Images.FediQrLogo}
                        />
                        <View style={styles(theme).addressTextContainer}>
                            <Text style={styles(theme).addressTitle}>
                                {t('phrases.bitcoin-address')}
                            </Text>
                            <Text
                                style={styles(theme).addressString}
                                numberOfLines={1}>
                                {stringUtils.truncateMiddleOfString(address, 6)}
                            </Text>
                        </View>
                    </Card>
                    <View style={styles(theme).buttonsContainer}>
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

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            width: '100%',
            alignItems: 'center',
        },
        addressTextContainer: {
            flexDirection: 'row',
            width: '100%',
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.sm,
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
