import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, StyleSheet, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { selectAuthenticatedMember } from '@fedi/common/redux'
import { encodeDirectChatLink } from '@fedi/common/utils/xmpp'

import { Images } from '../assets/images'
import { useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'MemberQrCode'>

const QR_CODE_SIZE = Dimensions.get('window').width * 0.7

const MemberQrCode: React.FC<Props> = ({ navigation, route }: Props) => {
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
            <View style={styles(theme).qrCodeContainer}>
                <QRCode
                    value={directChatLink}
                    size={QR_CODE_SIZE}
                    logo={Images.FediQrLogo}
                />
            </View>
            <Text style={styles(theme).noticeText} numberOfLines={2}>
                {t('feature.chat.scan-member-code-notice')}
            </Text>
            <Button
                fullWidth
                containerStyle={styles(theme).buttonContainer}
                title={t('feature.chat.scan-username')}
                onPress={goToScanMemberCode}
            />
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
        qrCodeContainer: {
            borderRadius: theme.borders.defaultRadius,
            backgroundColor: theme.colors.secondary,
            padding: QR_CODE_SIZE * 0.05,
            marginVertical: theme.spacing.xl,
            flexDirection: 'row',
            justifyContent: 'center',
        },
        noticeText: {
            color: theme.colors.secondary,
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.xl,
            marginHorizontal: theme.spacing.md,
            textAlign: 'center',
        },
        buttonContainer: {
            marginTop: 'auto',
        },
    })

export default MemberQrCode
