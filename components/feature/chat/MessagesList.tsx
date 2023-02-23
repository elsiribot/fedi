import { Theme, useTheme } from '@rneui/themed'
import React, { useRef } from 'react'
import { FlatList, ListRenderItem, StyleSheet } from 'react-native'

import { Message } from '../../../types'
import EmptyGroupNotice from './EmptyGroupNotice'
import MessageItem from './MessageItem'

type MessagesListProps = {
    messages: Message[]
    multiUserChat?: boolean
}

const MessagesList: React.FC<MessagesListProps> = ({
    messages,
    multiUserChat = false,
}: MessagesListProps) => {
    const { theme } = useTheme()
    const listRef = useRef<FlatList>(null)
    const renderMessage: ListRenderItem<Message> = ({ item }) => {
        return <MessageItem message={item} multiUserChat={multiUserChat} />
    }

    return (
        <FlatList
            data={messages}
            ref={listRef}
            renderItem={renderMessage}
            keyExtractor={(item: Message) => `${item.id}`}
            style={styles(theme).container}
            contentContainerStyle={styles(theme).contentContainer}
            onContentSizeChange={() => listRef.current?.scrollToEnd()}
            ListEmptyComponent={multiUserChat ? <EmptyGroupNotice /> : null}
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            width: '100%',
            paddingHorizontal: theme.spacing.xl,
        },
        contentContainer: {
            paddingTop: theme.spacing.md,
        },
    })

export default MessagesList
