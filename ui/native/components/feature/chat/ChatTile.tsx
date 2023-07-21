import { Text, Theme, useTheme } from '@rneui/themed'
import { t } from 'i18next'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { selectAuthenticatedMember } from '@fedi/common/redux'
import { ChatType, ChatWithLatestMessage } from '@fedi/common/types'
import dateUtils from '@fedi/common/utils/DateUtils'
import { makePaymentText } from '@fedi/common/utils/chat'

import { DEFAULT_GROUP_NAME } from '../../../constants'
import { useAppSelector } from '../../../state/hooks'
import Avatar from '../../ui/Avatar'
import { AvatarSize } from '../../ui/Avatar'
import GroupIcon from './GroupIcon'

type ChatTileProps = {
    chat: ChatWithLatestMessage
    selectChat: (chat: ChatWithLatestMessage) => void
}

const ChatTile = ({ chat, selectChat }: ChatTileProps) => {
    const { theme } = useTheme()
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)

    const { latestMessage, hasNewMessages } = chat
    const previewTextWeight = hasNewMessages ? { medium: true } : {}

    let previewMessage = latestMessage?.content
    if (latestMessage?.payment) {
        previewMessage = makePaymentText(t, latestMessage, authenticatedMember)
    }

    return (
        <Pressable
            style={styles(theme).container}
            onPress={() => selectChat(chat)}>
            <View style={styles(theme).iconContainer}>
                <View
                    style={[
                        styles(theme).unreadIndicator,
                        hasNewMessages ? { opacity: 1 } : { opacity: 0 },
                    ]}
                />
                <View style={styles(theme).chatTypeIconContainer}>
                    {chat.type === ChatType.direct ? (
                        <View style={styles(theme).directIconContainer}>
                            <Avatar
                                id={chat.id || ''}
                                name={chat.name || '?'}
                                size={AvatarSize.md}
                            />
                        </View>
                    ) : (
                        <GroupIcon chat={chat} />
                    )}
                </View>
            </View>
            <View style={styles(theme).contents}>
                <View style={styles(theme).topRow}>
                    <Text
                        style={styles(theme).namePreview}
                        numberOfLines={1}
                        bold>
                        {chat.name || DEFAULT_GROUP_NAME}
                    </Text>
                    {latestMessage?.sentAt && (
                        <Text small style={styles(theme).timestamp}>
                            {dateUtils.formatChatTileTimestamp(
                                latestMessage?.sentAt,
                            )}
                        </Text>
                    )}
                </View>
                <View style={styles(theme).bottomRow}>
                    {previewMessage ? (
                        <Text
                            caption
                            style={styles(theme).messagePreview}
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

                    {/* TODO: Implement pinned chat groups */}
                    {/* {chat.pinned && (
                        <SvgImage
                            name="Pin"
                            size={SvgImageSize.xs}
                            containerStyle={styles(theme).pinIcon}
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
            height: 64,
            marginVertical: 10,
        },
        directIconContainer: {
            height: theme.sizes.lg,
            width: theme.sizes.lg,
        },
        iconContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '20%',
        },
        contents: {
            width: '80%',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
        },
        topRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
        },
        bottomRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            width: '100%',
        },
        messagePreview: {
            width: '85%',
        },
        emptyMessagePreview: {
            width: '85%',
            color: theme.colors.grey,
            fontStyle: 'italic',
        },
        chatTypeIconContainer: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
        },
        pinIcon: {
            width: '10%',
            alignItems: 'flex-end',
            transform: [{ rotate: '45deg' }],
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
