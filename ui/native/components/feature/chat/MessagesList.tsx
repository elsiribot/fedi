import { Theme, useTheme, Text } from '@rneui/themed'
import React, { useRef } from 'react'
import { FlatList, ListRenderItem, StyleSheet, View } from 'react-native'

import { selectAuthenticatedMember } from '@fedi/common/redux'
import dateUtils from '@fedi/common/utils/DateUtils'
import { jidToId } from '@fedi/common/utils/chat'

import { useAppSelector } from '../../../state/hooks'
import { Message } from '../../../types'
import Avatar from '../../ui/Avatar'
import EmptyGroupNotice from './EmptyGroupNotice'
import MessageItem from './MessageItem'

type MessagesListProps = {
    messages: Message[][][]
    multiUserChat?: boolean
}

const MessagesList: React.FC<MessagesListProps> = ({
    messages,
    multiUserChat = false,
}: MessagesListProps) => {
    const { theme } = useTheme()
    const listRef = useRef<FlatList>(null)
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)

    const style = styles(theme)
    const myName = authenticatedMember?.username || ''

    const renderSenderGroup: ListRenderItem<Message[]> = ({ item }) => {
        if (!item.length) return null
        const sentBy = item[0].sentBy
        const sentByName = sentBy?.username || ''
        const sentByMe = sentByName && sentByName === myName
        return (
            <View style={style.senderGroup}>
                {!sentByMe && multiUserChat && (
                    <View style={style.senderNameContainer}>
                        <Text tiny>{sentByName}</Text>
                    </View>
                )}
                <View style={style.senderGroupContent}>
                    {!sentByMe && multiUserChat && (
                        <View style={style.senderAvatar}>
                            <Avatar
                                id={sentBy ? jidToId(sentBy.jid) : ''}
                                name={sentByName}
                            />
                        </View>
                    )}
                    <View>
                        <FlatList
                            data={item}
                            renderItem={info => (
                                <MessageItem
                                    message={info.item}
                                    multiUserChat={multiUserChat}
                                    last={info.index === item.length - 1}
                                />
                            )}
                            keyExtractor={innerItem => `${innerItem.id}`}
                            removeClippedSubviews={false}
                        />
                    </View>
                </View>
            </View>
        )
    }

    const renderTimeGroup: ListRenderItem<Message[][]> = ({ item }) => {
        const sentAt = item[0][0]?.sentAt
        return (
            <View style={style.timeGroupContainer}>
                {sentAt && (
                    <View style={style.timestampContainer}>
                        <Text tiny style={style.timestampText}>
                            {dateUtils.formatMessageItemTimestamp(sentAt)}
                        </Text>
                    </View>
                )}
                <FlatList
                    data={item}
                    renderItem={renderSenderGroup}
                    keyExtractor={innerItem => `${innerItem[0]?.id}`}
                    removeClippedSubviews={false}
                />
            </View>
        )
    }

    return (
        <FlatList
            data={messages}
            ref={listRef}
            renderItem={renderTimeGroup}
            keyExtractor={item => `${item[0][0]?.id}`}
            style={style.container}
            contentContainerStyle={style.contentContainer}
            onContentSizeChange={() => listRef.current?.scrollToEnd()}
            removeClippedSubviews={false}
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
        timeGroupContainer: {
            marginBottom: theme.spacing.md,
            color: theme.colors.darkGrey,
        },
        timestampContainer: {
            alignItems: 'center',
            width: '100%',
            marginBottom: theme.spacing.md,
        },
        timestampText: {
            color: theme.colors.darkGrey,
        },
        senderGroup: {
            marginBottom: theme.spacing.md,
        },
        senderAvatar: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            marginRight: theme.spacing.sm,
        },
        senderGroupContent: {
            flexDirection: 'row',
            alignItems: 'flex-end',
        },
        senderNameContainer: {
            paddingLeft: 42,
        },
    })

export default MessagesList
