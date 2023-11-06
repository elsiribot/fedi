import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
    StyleSheet,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import {
    joinChatGroup,
    selectActiveFederationId,
    selectChatGroup,
} from '@fedi/common/redux'
import { encodeGroupInvitationLink } from '@fedi/common/utils/xmpp'

import { Images } from '../assets/images'
import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'GroupInvite'>

const GroupInvite: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { groupId } = route.params
    const activeFederationId = useAppSelector(selectActiveFederationId)
    const dispatch = useAppDispatch()
    const { toast } = useEnvironmentContext().state
    const group = useAppSelector(s => selectChatGroup(s, groupId))
    const groupInvitationLink = encodeGroupInvitationLink(groupId)
    const { width } = useWindowDimensions()

    useEffect(() => {
        const handleJoinGroup = async () => {
            try {
                await dispatch(
                    joinChatGroup({
                        federationId: activeFederationId as string,
                        link: groupId,
                    }),
                ).unwrap()
            } catch (error) {}
        }
        handleJoinGroup()
    }, [activeFederationId, dispatch, groupId])

    const copyToClipboard = () => {
        Clipboard.setString(groupInvitationLink as string)
        toast?.show(t('feature.chat.copied-group-invite-code'))
    }

    const style = styles(theme, width)
    return (
        <View style={style.container}>
            <View style={style.textContainer}>
                <Text h2 medium>
                    {group?.name}
                </Text>
            </View>
            <View>
                <View style={style.qrCodeContainer}>
                    <QRCode
                        value={groupInvitationLink}
                        size={width * 0.7}
                        logo={Images.FediQrLogo}
                    />
                </View>
                <View style={style.copyInviteLinkContainer}>
                    <Text style={style.inviteLinkText} numberOfLines={1}>
                        {groupInvitationLink}
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
            </View>
            <Text
                style={style.inviteLinkNotice}
                numberOfLines={3}
                maxFontSizeMultiplier={1.4}>
                {t('feature.chat.invite-link-notice')}
            </Text>
        </View>
    )
}

const styles = (theme: Theme, width: number) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing.xl,
        },
        textContainer: {
            marginTop: 0,
            alignItems: 'center',
            justifyContent: 'flex-end',
        },
        qrCodeContainer: {
            borderRadius: theme.borders.defaultRadius,
            borderColor: theme.colors.primaryLight,
            borderWidth: 1,
            padding: theme.spacing.md,
            flexDirection: 'row',
            justifyContent: 'center',
            marginVertical: theme.spacing.xl,
        },
        copyInviteLinkContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            width: width * 0.7 + theme.spacing.md * 2,
            borderRadius: theme.borders.defaultRadius,
            borderColor: theme.colors.primaryLight,
            borderWidth: 1,
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
            color: theme.colors.primary,
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.xl,
            marginHorizontal: theme.spacing.md,
            textAlign: 'center',
        },
        buttonContainer: {
            marginTop: 'auto',
        },
        button: {
            backgroundColor: theme.colors.primary,
        },
        buttonTitle: {
            color: theme.colors.secondary,
        },
    })

export default GroupInvite
