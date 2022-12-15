import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Card, Text, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    ActivityIndicator,
    Dimensions,
    ImageBackground,
    Pressable,
    Share,
    StyleSheet,
    View,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { Images } from '../assets/images'

import {
    decodeInvoice,
    Invoice,
    ReceivedLightningEvent,
    TFedimintEventEmitter,
} from '../bridge'
import { useBridge } from '../contexts/FederationsContext'
import type { RootStackParamList } from '../Router'
import stringUtils from '../utils/StringUtils'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'SocialRecoveryQrModal'
>

const QR_CODE_SIZE = Dimensions.get('window').width * 0.7

const SocialRecoveryQrModal: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { backupQr } = useBridge()
    const [recoveryQrCode, setRecoveryQrCode] = useState<string>('')

    useEffect(() => {
        const getRecoveryAssistCode = async () => {
            const recoveryAssistCode = await backupQr()
            console.log('recoveryAssistCode', recoveryAssistCode)
            setRecoveryQrCode(recoveryAssistCode)
        }

        getRecoveryAssistCode()
    }, [navigation, backupQr])

    return (
        <View style={styles(theme).container}>
            <Pressable
                style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
                ]}
                onPress={navigation.goBack}
            />
            <View style={styles(theme).qrCodeContainer}>
                {recoveryQrCode ? (
                    <QRCode
                        value={recoveryQrCode}
                        size={QR_CODE_SIZE}
                        logo={Images.FediQrLogo}
                    />
                ) : null}
            </View>
            <Card containerStyle={styles(theme).roundedCardContainer}>
                <ImageBackground
                    style={styles(theme).imageBackground}
                    imageStyle={styles(theme).rounded}
                    source={Images.HoloBackground}>
                    <Text h4 h4Style={styles(theme).instructionsText}>
                        {t('feature.recovery.guardian-qr-instructions')}
                    </Text>
                </ImageBackground>
            </Card>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
        buttonsContainer: {
            width: '90%',
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        instructionsText: {
            margin: 8,
            fontWeight: '400',
            textAlign: 'center',
        },
        qrCodeContainer: {
            borderRadius: 14,
            padding: QR_CODE_SIZE * 0.05,
            backgroundColor: theme.colors.white,
            flexDirection: 'row',
            justifyContent: 'center',
        },
        roundedCardContainer: {
            borderRadius: 16,
            marginHorizontal: 16,
            padding: 0,
            backgroundColor: 'transparent',
            borderColor: 'transparent',
        },
        imageBackground: {
            borderRadius: 16,
            alignItems: 'center',
            padding: 12,
        },
        rounded: {
            borderRadius: 16,
        },
    })

export default SocialRecoveryQrModal
