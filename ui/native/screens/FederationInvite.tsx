import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { Images } from '../assets/images'
import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'FederationInvite'
>

const QR_CODE_SIZE = Dimensions.get('window').width * 0.7

const FederationInvite: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { toast } = useEnvironmentContext().state
    const { inviteLink } = route.params

    const copyToClipboard = () => {
        Clipboard.setString(inviteLink)
        toast?.show(t('feature.federations.copied-federation-invite'))
    }

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).qrCodeContainer}>
                <QRCode
                    value={inviteLink}
                    size={QR_CODE_SIZE}
                    logo={Images.FediQrLogo} //Should not be replaced with svg
                />
            </View>
            <View style={styles(theme).copyInviteLinkContainer}>
                <Text style={styles(theme).inviteLinkText} numberOfLines={1}>
                    {inviteLink}
                </Text>
                <TouchableOpacity
                    style={styles(theme).copyButtonContainer}
                    onPress={copyToClipboard}>
                    <SvgImage
                        name="Copy"
                        color={theme.colors.primary}
                        size={SvgImageSize.xs}
                    />
                    <Text style={styles(theme).copyText} numberOfLines={1}>
                        {t('words.copy')}
                    </Text>
                </TouchableOpacity>
            </View>
            <Text style={styles(theme).inviteLinkNotice} numberOfLines={1}>
                {t('feature.federations.invite-link-notice')}
            </Text>
            <SvgImage
                name="Scan"
                color={theme.colors.secondary}
                size={SvgImageSize.md}
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
            // TODO: Add react-linear-gradient-package and use
            // dark holo background instead of primary black
            backgroundColor: theme.colors.primary,
        },
        qrCodeContainer: {
            borderRadius: theme.borders.defaultRadius,
            backgroundColor: theme.colors.secondary,
            padding: QR_CODE_SIZE * 0.05,
            marginVertical: theme.spacing.xl,
            flexDirection: 'row',
            justifyContent: 'center',
        },
        copyInviteLinkContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            width: QR_CODE_SIZE * 1.1,
            backgroundColor: theme.colors.secondary,
            borderRadius: theme.borders.defaultRadius,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.md,
        },
        copyButtonContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            width: '15%',
        },
        inviteLinkText: {
            width: '85%',
            color: theme.colors.primaryLight,
            fontSize: theme.sizes.xxs,
        },
        copyText: {
            color: theme.colors.primary,
            fontSize: theme.sizes.xxs,
            paddingLeft: theme.spacing.xs,
        },
        inviteLinkNotice: {
            color: theme.colors.secondary,
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.xl,
        },
    })

export default FederationInvite
