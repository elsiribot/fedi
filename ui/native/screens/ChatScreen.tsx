import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { FAB, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'

import ChatsList from '../components/feature/chat/ChatsList'
import SvgImage from '../components/ui/SvgImage'
import {
    changeLastFetchedMessageId,
    useChatContext,
} from '../state/contexts/ChatContext'
import { useXmpp } from '../state/hooks/chat'
import { reset } from '../state/navigation'
import { ArchiveQueryPagination } from '../types'
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
    const { fetchMessagesFromArchive, fetchRoster } = useXmpp()
    const { state, dispatch } = useChatContext()
    const { websocketIsHealthy, lastFetchedMessageId, connectionOptions } =
        state

    useEffect(() => {
        if (!connectionOptions) {
            navigation.dispatch(reset('TabsNavigator'))
        }
    }, [connectionOptions, navigation])

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
                .then(messageId => {
                    if (messageId) {
                        dispatch(changeLastFetchedMessageId(messageId))
                    }
                })
                .catch(err => {
                    console.error(err)
                })
        }
    }, [
        dispatch,
        websocketIsHealthy,
        fetchMessagesFromArchive,
        lastFetchedMessageId,
    ])

    useEffect(() => {
        if (websocketIsHealthy) {
            // Here we fetch the roster and store the results in local storage
            fetchRoster()
        }
    }, [websocketIsHealthy, fetchRoster])

    return (
        <View style={styles(theme).container}>
            <ChatsList />

            <FAB
                icon={<SvgImage name="Plus" color={theme.colors.secondary} />}
                color={theme.colors.blue}
                style={styles(theme).actionButton}
                size="large"
                placement="right"
                onPress={() => {
                    navigation.navigate('NewMessage')
                }}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        actionButton: {
            elevation: 4,
            shadowRadius: 4,
            shadowColor: theme.colors.primary,
        },
    })

export default ChatScreen
