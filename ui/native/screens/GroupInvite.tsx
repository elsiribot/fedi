import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, useWindowDimensions } from 'react-native'

import {
    joinChatGroup,
    selectActiveFederationId,
    selectChatGroup,
} from '@fedi/common/redux'
import { encodeGroupInvitationLink } from '@fedi/common/utils/xmpp'

import QRScreen from '../components/ui/QRScreen'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'GroupInvite'>

const GroupInvite: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { groupId } = route.params
    const activeFederationId = useAppSelector(selectActiveFederationId)
    const dispatch = useAppDispatch()
    const group = useAppSelector(s => selectChatGroup(s, groupId))
    const groupInvitationLink = encodeGroupInvitationLink(groupId)
    const { width } = useWindowDimensions()

    useEffect(() => {
        const handleJoinGroup = async () => {
            await dispatch(
                joinChatGroup({
                    federationId: activeFederationId as string,
                    link: groupId,
                }),
            )
        }
        handleJoinGroup()
    }, [activeFederationId, dispatch, groupId])

    const style = styles(theme, width)
    return (
        <QRScreen
            title={group?.name}
            qrValue={groupInvitationLink}
            copyMessage={t('feature.chat.copied-group-invite-code')}
            bottom={
                <Text
                    style={style.inviteLinkNotice}
                    numberOfLines={3}
                    maxFontSizeMultiplier={1.4}>
                    {t('feature.chat.invite-link-notice')}
                </Text>
            }
        />
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
