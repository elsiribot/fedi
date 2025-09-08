import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'

import { ROOM_MENTION } from '@fedi/common/constants/matrix'
import {
    MatrixRoomMember,
    MemberItem,
    MentionItem,
    MentionSelect,
} from '@fedi/common/types'
import { getUserSuffix, matrixIdToUsername } from '@fedi/common/utils/matrix'

import { AvatarSize } from '../../ui/Avatar'
import ChatAvatar from '../chat/ChatAvatar'

type Props = {
    suggestions: MatrixRoomMember[]
    visible: boolean
    query?: string
    onSelect: (member: MentionSelect) => void
}

const ChatMentionSuggestions: React.FC<Props> = ({
    suggestions,
    visible,
    query = '',
    onSelect,
}) => {
    const { theme } = useTheme()
    const style = styles(theme)

    const includeRoom = !!query && ROOM_MENTION.startsWith(query.toLowerCase())
    // optional @room item
    const list = React.useMemo<MentionItem[]>(
        () => [
            ...(includeRoom
                ? [
                      {
                          id: '@room',
                          displayName: ROOM_MENTION,
                          kind: 'room',
                      } as const,
                  ]
                : []),
            ...suggestions.map((m): MemberItem => ({ ...m, kind: 'member' })),
        ],
        [suggestions, includeRoom],
    )

    if (!visible || list.length === 0) return null

    return (
        <View style={style.container}>
            <FlatList<MentionItem>
                data={list}
                keyExtractor={(item, i) =>
                    item.kind === 'room' ? `room-${i}` : item.id
                }
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ItemSeparatorComponent={() => <View style={style.separator} />}
                renderItem={({ item, index }) => {
                    const isRoom = item.kind === 'room'

                    return (
                        <Pressable
                            style={({ pressed }) => [
                                style.row,
                                pressed && style.rowPressed,
                                index === list.length - 1 && style.rowLast,
                            ]}
                            android_ripple={{ color: theme.colors.primary05 }}
                            onPress={() =>
                                onSelect(
                                    isRoom
                                        ? {
                                              id: '@room',
                                              displayName: ROOM_MENTION,
                                          }
                                        : item,
                                )
                            }>
                            {isRoom ? (
                                <View style={style.roomBadge}>
                                    <Text style={style.roomAt}>@</Text>
                                </View>
                            ) : (
                                <ChatAvatar user={item} size={AvatarSize.md} />
                            )}

                            <View style={style.textCol}>
                                <Text
                                    medium
                                    numberOfLines={1}
                                    style={style.name}>
                                    {isRoom
                                        ? `@${ROOM_MENTION}`
                                        : item.displayName ||
                                          matrixIdToUsername(item.id)}
                                </Text>

                                {!isRoom && (
                                    <Text
                                        caption
                                        numberOfLines={1}
                                        style={style.sub}>
                                        {getUserSuffix(item.id)}
                                    </Text>
                                )}
                            </View>
                        </Pressable>
                    )
                }}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            width: '100%',
            alignSelf: 'stretch',
            marginBottom: 0,
            maxHeight: 280,
            backgroundColor: theme.colors.white,
            borderRadius: 0,
            overflow: 'hidden',
            shadowColor: theme.colors.night,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 24,
            elevation: 8,
            zIndex: 3,
            borderTopWidth: 1,
            borderTopColor: theme.colors.extraLightGrey,
        },

        row: {
            minHeight: 48,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: 'transparent',
        },
        rowPressed: {
            backgroundColor: theme.colors.primary05,
        },
        rowLast: { borderBottomWidth: 0 },

        separator: {
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.colors.extraLightGrey,
            alignSelf: 'stretch',
        },

        textCol: { flex: 1, marginLeft: theme.spacing.md },
        name: { color: theme.colors.night },
        sub: { color: theme.colors.grey, opacity: 0.8 },

        roomBadge: {
            width: theme.sizes.mediumAvatar,
            height: theme.sizes.mediumAvatar,
            borderRadius: theme.sizes.mediumAvatar / 2,
            backgroundColor: theme.colors.blue,
            justifyContent: 'center',
            alignItems: 'center',
        },
        roomAt: {
            color: theme.colors.white,
            fontWeight: '700',
            fontSize: 16,
            lineHeight: 18,
        },
    })

export default React.memo(ChatMentionSuggestions)
