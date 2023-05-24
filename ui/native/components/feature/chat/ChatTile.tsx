import { Text, Theme, useTheme } from '@rneui/themed'
import { t } from 'i18next'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import dateUtils from '@fedi/common/utils/DateUtils'
import stringUtils from '@fedi/common/utils/StringUtils'

import { DEFAULT_GROUP_NAME } from '../../../constants'
import { Chat, ChatType } from '../../../types'
import Avatar from '../../ui/Avatar'
import { AvatarSize } from '../../ui/Avatar'
import SvgImage, { SvgImageName, SvgImageSize } from '../../ui/SvgImage'
import GroupIcon from './GroupIcon'

type ChatTileProps = {
    chat: Chat
    selectChat: (chat: Chat) => void
}

const ChatTile = ({ chat, selectChat }: ChatTileProps) => {
    const { theme } = useTheme()

    return (
        <Pressable
            style={styles(theme).container}
            onPress={() => selectChat(chat)}>
            <View style={styles(theme).iconContainer}>
                <View
                    style={[
                        styles(theme).unreadIndicator,
                        chat.hasNewMessages ? { opacity: 1 } : { opacity: 0 },
                    ]}
                />
                <View style={styles(theme).chatTypeIconContainer}>
                    {chat.type === ChatType.direct ? (
                        <View style={styles(theme).directIconContainer}>
                            {chat.members && chat.members[0]?.username ? (
                                <Avatar
                                    id={chat.members[0].jid.toString()}
                                    title={stringUtils.getInitialsFromName(
                                        chat.members[0].username,
                                    )}
                                    size={AvatarSize.md}
                                />
                            ) : (
                                <SvgImage
                                    name="SocialPeople"
                                    size={SvgImageSize.lg}
                                />
                            )}
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
                    {chat.lastReceivedTimestamp && (
                        <Text small style={styles(theme).timestamp}>
                            {dateUtils.formatChatTileTimestamp(
                                chat.lastReceivedTimestamp!,
                            )}
                        </Text>
                    )}
                </View>
                <View style={styles(theme).bottomRow}>
                    {chat.messagePreview ? (
                        <Text
                            caption
                            style={styles(theme).messagePreview}
                            numberOfLines={1}>
                            {chat.messagePreview}
                        </Text>
                    ) : (
                        <Text
                            caption
                            style={styles(theme).emptyMessagePreview}
                            numberOfLines={1}>
                            {t('feature.chat.no-one-is-in-this-group')}
                        </Text>
                    )}

                    {chat.pinned && (
                        <SvgImage
                            name="Pin"
                            size={SvgImageSize.xs}
                            containerStyle={styles(theme).pinIcon}
                        />
                    )}
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
