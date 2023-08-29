import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, StyleSheet, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { selectAuthenticatedMember } from '@fedi/common/redux'
import { encodeDirectChatLink } from '@fedi/common/utils/xmpp'

import { Images } from '../assets/images'
import SvgImage from '../components/ui/SvgImage'
import { useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'MemberQrCode'>

const QR_CODE_SIZE = Dimensions.get('window').width * 0.7

const MemberQrCode: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const member = useAppSelector(selectAuthenticatedMember)

    if (!member) return null

    const directChatLink = encodeDirectChatLink(member.username)

    const goToScanMemberCode = () => {
        navigation.navigate('ScanMemberCode')
    }

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).textContainer}>
                <Text h2 medium numberOfLines={1} adjustsFontSizeToFit>
                    {member.username}
                </Text>
                <Text caption style={styles(theme).noticeText}>
                    {t('feature.chat.scan-member-code-notice')}
                </Text>
            </View>
            <View style={styles(theme).qrCodeContainer}>
                <QRCode
                    value={directChatLink}
                    size={QR_CODE_SIZE}
                    logo={Images.FediQrLogo}
                />
            </View>
            <View style={styles(theme).bottomContainer}>
                <Button
                    fullWidth
                    buttonStyle={styles(theme).button}
                    titleStyle={styles(theme).buttonText}
                    containerStyle={styles(theme).buttonContainer}
                    title={t('feature.chat.open-camera-scanner')}
                    icon={<SvgImage name="Scan" color={theme.colors.primary} />}
                    onPress={goToScanMemberCode}
                />
            </View>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.xl,
        },
        textContainer: {
            flexBasis: 10,
            flexGrow: 1,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'flex-end',
        },
        qrCodeContainer: {
            borderRadius: theme.borders.defaultRadius,
            borderColor: theme.colors.primaryLight,
            borderWidth: 1,
            padding: QR_CODE_SIZE * 0.05,
            flexDirection: 'row',
            justifyContent: 'center',
        },
        noticeText: {
            color: theme.colors.grey,
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            textAlign: 'center',
        },
        bottomContainer: {
            width: '100%',
            flexBasis: 100,
            flexGrow: 1,
            flexShrink: 0,
        },
        buttonContainer: {
            marginTop: 'auto',
        },
        button: {
            backgroundColor: theme.colors.secondary,
        },
        buttonText: {
            color: theme.colors.primary,
        },
    })

export default MemberQrCode
