import { useIsFocused } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useUpdateLastMessageRead } from '@fedi/common/hooks/chat'
import {
    joinChatGroup,
    selectActiveFederationId,
    selectChatGroup,
    selectChatMessages,
} from '@fedi/common/redux'
import { makeMessageGroups } from '@fedi/common/utils/chat'
import { makeLog } from '@fedi/common/utils/log'
import { encodeGroupInvitationLink } from '@fedi/common/utils/xmpp'

import MessagesList from '../components/feature/chat/MessagesList'
import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

const log = makeLog('GroupChat')

export type Props = NativeStackScreenProps<RootStackParamList, 'GroupChat'>

/** @deprecated XMPP legacy code */
const GroupChat: React.FC<Props> = ({ navigation, route }: Props) => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { groupId } = route.params
    const isFocused = useIsFocused()
    const federationId = useAppSelector(selectActiveFederationId)
    const group = useAppSelector(s => selectChatGroup(s, groupId))
    const messages = useAppSelector(s => selectChatMessages(s, groupId))
    const [failedToJoin, setFailedToJoin] = useState(false)

    // If they're not a part of the group, encode a join link and attempt a join
    const isGroupFound = !!group
    useEffect(() => {
        if (isGroupFound || failedToJoin || !isFocused || !federationId) return
        dispatch(
            joinChatGroup({
                federationId,
                link: encodeGroupInvitationLink(groupId),
            }),
        )
            .unwrap()
            .catch(err => {
                log.warn(
                    `Attempted to join missing group ${groupId} but failed`,
                    err,
                )
                setFailedToJoin(true)
            })
    }, [isGroupFound, groupId, failedToJoin, federationId, isFocused, dispatch])

    const messageCollections = useMemo(
        () => makeMessageGroups(messages, 'desc'),
        [messages],
    )

    // Use this hook only if the screen is in focus
    useUpdateLastMessageRead(groupId, messages, isFocused !== true)

    // Render a spinner while attempting join, error message if it fails
    if (!group) {
        return (
            <View style={styles(theme).container}>
                {failedToJoin ? (
                    <View style={styles(theme).errorMessage}>
                        <SvgImage size={SvgImageSize.md} name="ScanSad" />
                        <Text>{t('feature.chat.invalid-group')}</Text>
                        <Button onPress={() => navigation.goBack()}>
                            {t('phrases.go-back')}
                        </Button>
                    </View>
                ) : (
                    <ActivityIndicator />
                )}
            </View>
        )
    }

    return (
        <View style={styles(theme).container}>
            <MessagesList messages={messageCollections} multiUserChat />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        noticeText: {
            textAlign: 'center',
            padding: theme.spacing.xl,
            color: theme.colors.primaryLight,
            width: '70%',
        },
        errorMessage: {
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: theme.spacing.lg,
        },
    })

export default GroupChat
