import Clipboard from '@react-native-clipboard/clipboard'
import { Button, Card, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, Share, StyleSheet, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { Images } from '../../../assets/images'
import { BitcoinOrLightning, BtcLnUri } from '../../../types'
import stringUtils from '../../../utils/StringUtils'

export type ReceiveQrProps = {
    uri: BtcLnUri
    type?: BitcoinOrLightning
}

const QR_CODE_SIZE = Dimensions.get('window').width * 0.8

const ReceiveQr: React.FC<ReceiveQrProps> = ({ uri, type }: ReceiveQrProps) => {
    const { theme } = useTheme()
    const { t } = useTranslation()

    const copyToClipboard = () => {
        Clipboard.setString(uri.fullString!)
    }

    const openShareDialog = async () => {
        // open share dialog
        try {
            const result = await Share.share({
                message: uri.fullString!,
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
        <View style={styles(theme).container}>
            <Card containerStyle={styles(theme).roundedCardContainer}>
                <QRCode
                    value={uri.fullString!}
                    size={QR_CODE_SIZE}
                    logo={Images.FediQrLogo}
                />
                <View style={styles(theme).uriInfoContainer}>
                    <Text style={styles(theme).uriTypeText}>
                        {type === BitcoinOrLightning.lightning
                            ? t('phrases.lightning-request')
                            : t('phrases.onchain-address')}
                    </Text>
                    <Text style={styles(theme).uriBodyString} numberOfLines={1}>
                        {stringUtils.truncateMiddleOfString(uri.body, 6)}
                    </Text>
                </View>
            </Card>
            <View style={styles(theme).buttonsContainer}>
                <Button
                    title={t('words.share')}
                    onPress={openShareDialog}
                    containerStyle={styles(theme).button}
                />
                <Button
                    title={t('words.copy')}
                    onPress={copyToClipboard}
                    containerStyle={styles(theme).button}
                />
            </View>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
        },
        buttonsContainer: {
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginVertical: theme.spacing.xl,
        },
        button: {
            width: '48%',
            marginVertical: theme.spacing.md,
        },
        uriInfoContainer: {
            flexDirection: 'row',
            width: '100%',
            marginTop: theme.spacing.lg,
            marginBottom: theme.spacing.sm,
        },
        uriTypeText: {
            flex: 1,
        },
        uriBodyString: {
            flex: 1,
            textAlign: 'right',
        },
        roundedCardContainer: {
            borderRadius: 20,
            width: '100%',
        },
    })

export default ReceiveQr
