import { Text, Theme, useTheme } from '@rneui/themed'
import { t } from 'i18next'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { MatrixRoom } from '@fedi/common/types'
import dateUtils from '@fedi/common/utils/DateUtils'

import { DEFAULT_GROUP_NAME } from '../../../constants'
import Avatar from '../../ui/Avatar'
import { AvatarSize } from '../../ui/Avatar'
import GroupIcon from './GroupIcon'

type ChatTileProps = {
    room: MatrixRoom
    selectChat: (chat: MatrixRoom) => void
}

const ChatTile = ({ room, selectChat }: ChatTileProps) => {
    const { theme } = useTheme()

    const hasNewMessages = room.notificationCount > 0
    const previewTextWeight = hasNewMessages ? { medium: true } : {}
    const previewMessage = room.preview?.body

    return (
        <Pressable
            style={styles(theme).container}
            onPress={() => selectChat(room)}>
            <View style={styles(theme).iconContainer}>
                <View
                    style={[
                        styles(theme).unreadIndicator,
                        hasNewMessages ? { opacity: 1 } : { opacity: 0 },
                    ]}
                />
                <View style={styles(theme).chatTypeIconContainer}>
                    {room.directUserId ? (
                        <Avatar
                            id={room.directUserId || ''}
                            name={room.name || '?'}
                            size={AvatarSize.md}
                        />
                    ) : (
                        <GroupIcon chat={room} />
                    )}
                </View>
            </View>
            <View style={styles(theme).content}>
                <View style={styles(theme).preview}>
                    <Text
                        style={styles(theme).namePreview}
                        numberOfLines={1}
                        bold>
                        {room.name || DEFAULT_GROUP_NAME}
                    </Text>
                    {previewMessage ? (
                        <Text
                            caption
                            style={[
                                styles(theme).messagePreview,
                                hasNewMessages
                                    ? styles(theme).messagePreviewUnread
                                    : undefined,
                            ]}
                            numberOfLines={1}
                            {...previewTextWeight}>
                            {previewMessage}
                        </Text>
                    ) : (
                        <Text
                            caption
                            style={styles(theme).emptyMessagePreview}
                            numberOfLines={1}
                            {...previewTextWeight}>
                            {t('feature.chat.no-one-is-in-this-group')}
                        </Text>
                    )}
                </View>
                <View style={styles(theme).metadata}>
                    {room.preview?.timestamp && (
                        <Text small style={styles(theme).timestamp}>
                            {dateUtils.formatChatTileTimestamp(
                                room.preview.timestamp / 1000,
                            )}
                        </Text>
                    )}
                    {/* TODO: Implement pinned chat groups */}
                    {/* {chat.pinned && (
                        <SvgImage
                            name="Pin"
                            size={SvgImageSize.xs}
                            containerStyle={styles(theme).pinIcon}
                            color={theme.colors.grey}
                        />
                    )} */}
                </View>
            </View>
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: theme.spacing.md,
        },
        iconContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            flexShrink: 0,
        },
        content: {
            flex: 1,
            flexDirection: 'row',
            minHeight: 48,
        },
        preview: {
            flex: 1,
            flexDirection: 'column',
            gap: theme.spacing.xs,
        },
        metadata: {
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
            gap: theme.spacing.xs,
        },
        messagePreview: {
            color: theme.colors.darkGrey,
        },
        messagePreviewUnread: {
            color: theme.colors.primary,
        },
        emptyMessagePreview: {
            color: theme.colors.grey,
            fontStyle: 'italic',
        },
        chatTypeIconContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            marginRight: theme.spacing.md,
        },
        pinIcon: {
            alignItems: 'flex-end',
            color: theme.colors.grey,
        },
        unreadIndicator: {
            backgroundColor: theme.colors.red,
            height: theme.sizes.unreadIndicatorSize,
            width: theme.sizes.unreadIndicatorSize,
            marginHorizontal: theme.spacing.xs,
            borderRadius: theme.sizes.unreadIndicatorSize * 0.5,
        },
        namePreview: {
            width: '80%',
        },
        timestamp: {
            color: theme.colors.grey,
        },
    })

export default ChatTile
