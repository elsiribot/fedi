import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { FlatList, ListRenderItem, StyleSheet } from 'react-native'

import { Message } from '../../../types'
import MessageItem from './MessageItem'

type MessagesListProps = {
    messages: Message[]
}

const MessagesList: React.FC<MessagesListProps> = ({
    messages,
}: MessagesListProps) => {
    const { theme } = useTheme()
    const renderMessage: ListRenderItem<Message> = ({ item }) => {
        return <MessageItem message={item} />
    }

    return (
        <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item: Message) => `${item.id}`}
            style={styles(theme).container}
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            width: '100%',
            paddingHorizontal: theme.spacing.xl,
        },
    })

export default MessagesList
