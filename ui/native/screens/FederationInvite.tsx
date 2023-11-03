import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import {
    StyleSheet,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { Images } from '../assets/images'
import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'FederationInvite'
>

const FederationInvite: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { toast } = useEnvironmentContext().state
    const { inviteLink } = route.params
    const { width } = useWindowDimensions()

    const copyToClipboard = () => {
        Clipboard.setString(inviteLink)
        toast?.show(t('feature.federations.copied-federation-invite'))
    }

    const style = styles(theme, width)
    return (
        <View style={style.container}>
            <View style={style.qrCodeContainer}>
                <QRCode
                    value={inviteLink}
                    size={width * 0.7}
                    logo={Images.FediQrLogo} //Should not be replaced with svg
                />
            </View>
            <View style={style.copyInviteLinkContainer}>
                <Text style={style.inviteLinkText} numberOfLines={1}>
                    {inviteLink}
                </Text>
                <TouchableOpacity
                    style={style.copyButtonContainer}
                    onPress={copyToClipboard}>
                    <SvgImage
                        name="Copy"
                        color={theme.colors.primary}
                        size={SvgImageSize.xs}
                    />
                    <Text style={style.copyText} numberOfLines={1}>
                        {t('words.copy')}
                    </Text>
                </TouchableOpacity>
            </View>
            <Text style={style.inviteLinkNotice} numberOfLines={2}>
                {t('feature.federations.invite-link-notice')}
            </Text>
        </View>
    )
}

const styles = (theme: Theme, width: number) =>
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
            padding: theme.spacing.md,
            marginVertical: theme.spacing.xl,
            flexDirection: 'row',
            justifyContent: 'center',
        },
        copyInviteLinkContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            width: width * 0.7 + theme.spacing.md * 2,
            backgroundColor: theme.colors.secondary,
            borderRadius: theme.borders.defaultRadius,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.md,
        },
        inviteLinkText: {
            flex: 1,
            color: theme.colors.primaryLight,
            fontSize: theme.sizes.xxs,
            textAlign: 'center',
        },
        copyButtonContainer: {
            flexShrink: 0,
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: theme.spacing.sm,
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
