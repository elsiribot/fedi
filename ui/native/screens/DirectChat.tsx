import { useIsFocused } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useUpdateLastMessageRead } from '@fedi/common/hooks/chat'
import {
    fetchChatMember,
    selectChatClientStatus,
    selectChatConnectionOptions,
    selectChatMember,
    selectChatMessages,
    sendDirectMessage,
} from '@fedi/common/redux'
import { makeMessageGroups } from '@fedi/common/utils/chat'

import { fedimint } from '../bridge'
import MessageInput from '../components/feature/chat/MessageInput'
import MessagesList from '../components/feature/chat/MessagesList'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'DirectChat'>

const DirectChat: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { memberId: memberIdParam } = route.params

    // Check for missing domain in case we scan an old member QR
    let memberId = memberIdParam
    const connectionOptions = useAppSelector(selectChatConnectionOptions)
    if (!memberId?.includes('@') && connectionOptions) {
        const { domain } = connectionOptions
        memberId = `${memberId}@${domain}`
    }

    const isFocused = useIsFocused()
    const dispatch = useAppDispatch()
    const activeFederationId = useAppSelector(
        s => s.federation.activeFederationId,
    )
    const { toast } = useEnvironmentContext().state
    const messages = useAppSelector(s => selectChatMessages(s, memberId))
    const isChatOnline = useAppSelector(selectChatClientStatus) === 'online'
    const member = useAppSelector(s => selectChatMember(s, memberId))

    const messageCollections = useMemo(
        () => makeMessageGroups(messages, 'desc'),
        [messages],
    )

    // If we don't have info about this member, attempt to fetch a pubkey for them
    useEffect(() => {
        if (member || !activeFederationId || !isChatOnline) return
        dispatch(
            fetchChatMember({ federationId: activeFederationId, memberId }),
        ).catch(() => {
            /* no-op */
        })
    }, [activeFederationId, dispatch, isChatOnline, member, memberId])

    // Use this hook only if the screen is in focus
    useUpdateLastMessageRead(
        memberId,
        messageCollections[0]?.[0]?.[0],
        isFocused !== true,
    )

    const handleSend = useCallback(
        async (messageText: string) => {
            // If the memberId is not stored, then we have failed to fetch the pubkey
            // and cannot send messages
            if (member) {
                await dispatch(
                    sendDirectMessage({
                        fedimint,
                        federationId: activeFederationId as string,
                        recipientId: memberId,
                        content: messageText,
                    }),
                ).unwrap()
            } else {
                toast?.show(t('errors.chat-member-not-found'), 4000)
            }
        },
        [activeFederationId, dispatch, member, memberId, t, toast],
    )

    return (
        <View style={styles(theme).container}>
            <MessagesList messages={messageCollections} />
            <MessageInput onMessageSubmitted={handleSend} />
        </View>
    )
}

const styles = (_: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
    })

export default DirectChat
