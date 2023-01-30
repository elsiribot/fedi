import { Icon, Text, Theme, useTheme } from '@rneui/themed'
import { t } from 'i18next'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { DEFAULT_GROUP_NAME } from '../../../constants'
import { Chat, ChatType } from '../../../types'
import DateUtils from '../../../utils/DateUtils'
import stringUtils from '../../../utils/StringUtils'
import HoloAvatar from '../../ui/HoloAvatar'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

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
                {chat.type === ChatType.direct ? (
                    <View style={styles(theme).icon}>
                        {chat.members && chat.members[0]?.username ? (
                            <HoloAvatar
                                title={stringUtils.getInitialsFromName(
                                    chat.members[0].username,
                                )}
                            />
                        ) : (
                            <SvgImage
                                name="SocialPeople"
                                size={SvgImageSize.md}
                            />
                        )}
                    </View>
                ) : (
                    <SvgImage
                        name={chat.icon ? chat.icon : 'SocialPeople'}
                        size={SvgImageSize.md}
                    />
                )}
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
                        <Text small>
                            {DateUtils.formatChatTileTimestamp(
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
                            numberOfLines={2}>
                            {chat.messagePreview}
                        </Text>
                    ) : (
                        <Text
                            caption
                            style={styles(theme).emptyMessagePreview}
                            numberOfLines={2}>
                            {t('feature.community.no-one-is-in-this-group')}
                        </Text>
                    )}

                    {chat.pinned && (
                        <Icon
                            name="pin"
                            type="material-community"
                            size={theme.sizes.xs}
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
        icon: {
            height: theme.sizes.md,
            width: theme.sizes.md,
        },
        iconContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            width: '18%',
        },
        contents: {
            width: '82%',
        },
        topRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
            height: '40%',
        },
        bottomRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            width: '100%',
            height: '60%',
        },
        messagePreview: {
            width: '90%',
        },
        emptyMessagePreview: {
            width: '90%',
            color: theme.colors.grey,
            fontStyle: 'italic',
        },
        pinIcon: {
            width: '10%',
            alignItems: 'flex-end',
            transform: [{ rotate: '45deg' }],
        },
        unreadIndicator: {
            backgroundColor: theme.colors.red,
            height: theme.sizes.xxs,
            width: theme.sizes.xxs,
            marginRight: theme.spacing.xs,
            borderRadius: theme.sizes.xxs * 0.5,
        },
        namePreview: {
            width: '80%',
        },
    })

export default ChatTile
