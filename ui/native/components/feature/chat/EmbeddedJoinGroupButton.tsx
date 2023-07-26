import Clipboard from '@react-native-clipboard/clipboard'
import { useNavigation } from '@react-navigation/native'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { joinChatGroup, selectChatXmppClient } from '@fedi/common/redux'
import { encodeGroupInvitationLink } from '@fedi/common/utils/xmpp'

import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import { ChatGroup } from '../../../types'
import { NavigationHook } from '../../../types/navigation'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type Props = {
    groupId: string
}

const EmbeddedJoinGroupButton: React.FC<Props> = ({ groupId }: Props) => {
    const navigation = useNavigation<NavigationHook>()
    const dispatch = useAppDispatch()
    const federationId = useAppSelector(s => s.federation.activeFederationId)
    const xmppClient = useAppSelector(selectChatXmppClient)
    const { toast } = useEnvironmentContext().state
    const { t } = useTranslation()
    const { theme } = useTheme()
    const [groupConfig, setGroupConfig] =
        useState<Pick<ChatGroup, 'name' | 'broadcastOnly'>>()

    const copyToClipboard = () => {
        const invitationLink = encodeGroupInvitationLink(groupId)
        Clipboard.setString(invitationLink as string)
        toast?.show(t('feature.chat.copied-group-invite-code'), 3000)
    }

    const handleJoinGroup = useCallback(async () => {
        if (!federationId) return
        try {
            const res = await dispatch(
                joinChatGroup({
                    federationId,
                    link: encodeGroupInvitationLink(groupId),
                }),
            ).unwrap()
            navigation.replace('GroupChat', {
                groupId: res.id,
            })
        } catch (error) {
            toast?.show(t('errors.chat-unavailable'), 3000)
        }
    }, [dispatch, federationId, groupId, navigation, t, toast])

    useEffect(() => {
        if (!xmppClient || !groupId) return
        const refreshGroupConfig = async () => {
            const config = await xmppClient.fetchGroupConfig(groupId)
            setGroupConfig(config)
        }
        refreshGroupConfig()
    }, [groupId, xmppClient])

    if (!groupConfig) return null

    return (
        <Button
            size="sm"
            color={theme.colors.secondary}
            containerStyle={styles(theme).container}
            onPress={handleJoinGroup}
            onLongPress={copyToClipboard}
            title={
                <View style={styles(theme).contents}>
                    <SvgImage
                        containerStyle={styles(theme).icon}
                        name={
                            groupConfig.broadcastOnly
                                ? 'SpeakerPhone'
                                : 'SocialPeople'
                        }
                        size={SvgImageSize.xs}
                    />
                    <Text medium caption>
                        {`${t('words.join')} `}
                    </Text>
                    <Text
                        bold
                        caption
                        numberOfLines={1}
                        style={styles(theme).groupNameText}>
                        {`${groupConfig.name}`}
                    </Text>
                </View>
            }
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {},
        contents: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '100%',
        },
        icon: {
            marginRight: theme.spacing.sm,
        },
        groupNameText: {
            maxWidth: '70%',
        },
    })

export default EmbeddedJoinGroupButton
