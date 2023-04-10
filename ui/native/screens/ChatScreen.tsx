import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { FAB, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'

import ChatsList from '../components/feature/chat/ChatsList'
import SvgImage from '../components/ui/SvgImage'
import { useChatContext } from '../state/contexts/ChatContext'
import { useXmpp } from '../state/hooks/chat'
import { ArchiveQueryPagination, Keypair } from '../types'
import {
    NavigationHook,
    RootStackParamList,
    TabsNavigatorParamList,
} from '../types/navigation'

export type Props = BottomTabScreenProps<
    TabsNavigatorParamList & RootStackParamList,
    'Chat'
>

const ChatScreen: React.FC<Props> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const { fetchMessagesFromArchive, fetchRoster, publishPublicKey } =
        useXmpp()
    const { websocketIsHealthy, lastFetchedMessageId, encryptionKeys } =
        useChatContext().state

    useEffect(() => {
        if (websocketIsHealthy) {
            // Here we fetch any messages we may have missed while offline
            // 20 at a time with pagination
            // TODO: optimize by only fetching messages sent after the last received timestamp
            const pagination: ArchiveQueryPagination = {
                limit: '20',
            }
            if (lastFetchedMessageId) {
                pagination.after = lastFetchedMessageId
            }
            fetchMessagesFromArchive(null, pagination)
        }
    }, [websocketIsHealthy, fetchMessagesFromArchive, lastFetchedMessageId])

    useEffect(() => {
        if (websocketIsHealthy) {
            // Here we fetch the roster and store the results in local storage
            fetchRoster()
        }
    }, [websocketIsHealthy, fetchRoster])

    useEffect(() => {
        if (websocketIsHealthy && encryptionKeys) {
            // Here we make sure this public key is published for other users
            // to subscribe to and encrypt messages sent to this user
            const { publicKey } = encryptionKeys as Keypair
            publishPublicKey(publicKey)
        }
    }, [encryptionKeys, publishPublicKey, websocketIsHealthy])

    return (
        <View style={styles(theme).container}>
            <ChatsList />

            <FAB
                icon={<SvgImage name="Plus" color={theme.colors.secondary} />}
                color={theme.colors.primary}
                size="large"
                placement="right"
                onPress={() => {
                    navigation.navigate('NewMessage')
                }}
            />
        </View>
    )
}

const styles = (_: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
    })

export default ChatScreen
