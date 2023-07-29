import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { joinChatGroup, selectChatGroup } from '@fedi/common/redux'
import { encodeGroupInvitationLink } from '@fedi/common/utils/xmpp'

import { Images } from '../assets/images'
import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'GroupInvite'>

const QR_CODE_SIZE = Dimensions.get('window').width * 0.7

const GroupInvite: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { groupId } = route.params
    const activeFederationId = useAppSelector(
        s => s.federation.activeFederationId,
    )
    const dispatch = useAppDispatch()
    const { toast } = useEnvironmentContext().state
    const group = useAppSelector(s => selectChatGroup(s, groupId))
    const groupInvitationLink = encodeGroupInvitationLink(groupId)

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

    const viewGroup = () => {
        navigation.navigate('GroupChat', { groupId })
    }

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).textContainer}>
                <Text h2 medium>
                    {group?.name}
                </Text>
            </View>
            <View style={styles(theme).qrCodeContainer}>
                <QRCode
                    value={groupInvitationLink}
                    size={QR_CODE_SIZE}
                    logo={Images.FediQrLogo}
                />
            </View>
            <View style={styles(theme).copyInviteLinkContainer}>
                <Text style={styles(theme).inviteLinkText} numberOfLines={1}>
                    {groupInvitationLink}
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
            <Text style={styles(theme).inviteLinkNotice} numberOfLines={2}>
                {t('feature.chat.invite-link-notice')}
            </Text>
            <Button
                fullWidth
                containerStyle={styles(theme).buttonContainer}
                titleStyle={styles(theme).buttonTitle}
                buttonStyle={styles(theme).button}
                title={t('feature.chat.view-group')}
                onPress={viewGroup}
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
        textContainer: {
            marginTop: 'auto',
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
            marginVertical: theme.spacing.xl,
        },
        copyInviteLinkContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            width: QR_CODE_SIZE * 1.1,
            borderRadius: theme.borders.defaultRadius,
            borderColor: theme.colors.primaryLight,
            borderWidth: 1,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.md,
        },
        copyButtonContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            width: '20%',
        },
        inviteLinkText: {
            width: '80%',
            color: theme.colors.primaryLight,
            fontSize: theme.sizes.xxs,
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
