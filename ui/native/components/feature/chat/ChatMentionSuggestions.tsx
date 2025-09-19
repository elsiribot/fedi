import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useMemo } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'
import { NativeViewGestureHandler } from 'react-native-gesture-handler'

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
    onSelect: (member: MentionSelect) => void
    maxHeight?: number
    topSpacer?: number
}

const DEFAULT_MAX_HEIGHT = 280
const ROW_HEIGHT = 64
const SEPARATOR_H = StyleSheet.hairlineWidth

const ChatMentionSuggestions: React.FC<Props> = ({
    suggestions,
    visible,
    onSelect,
    maxHeight,
    topSpacer = 0, //this is for the added 'room' at the top of the list
}) => {
    const { theme } = useTheme()
    const style = styles(theme)

    const list = useMemo<MentionItem[]>(
        () => [
            { id: '@room', displayName: ROOM_MENTION, kind: 'room' } as const,
            ...suggestions.map((m): MemberItem => ({ ...m, kind: 'member' })),
        ],
        [suggestions],
    )

    if (!visible || list.length === 0) return null

    // exact content height = prevents tiny scroll with only 2 items
    const contentHeight =
        list.length * ROW_HEIGHT + Math.max(0, list.length - 1) * SEPARATOR_H
    const maxH = Math.max(0, maxHeight ?? DEFAULT_MAX_HEIGHT)
    const containerHeight = Math.min(contentHeight, maxH)
    const needsScroll = contentHeight > maxH //is scroll required?

    return (
        <View
            style={[style.container, { height: containerHeight }]}
            pointerEvents="auto"
            collapsable={false}>
            <NativeViewGestureHandler disallowInterruption>
                <FlatList<MentionItem>
                    data={list}
                    keyExtractor={(item, i) =>
                        item.kind === 'room' ? `room-${i}` : item.id
                    }
                    style={{ height: containerHeight, width: '100%' }}
                    scrollEnabled={needsScroll}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={needsScroll}
                    keyboardShouldPersistTaps="always"
                    removeClippedSubviews={false}
                    initialNumToRender={8}
                    windowSize={7}
                    scrollEventThrottle={16}
                    ListHeaderComponent={
                        needsScroll && topSpacer > 0 ? (
                            <View style={{ height: topSpacer }} />
                        ) : null
                    }
                    contentContainerStyle={{
                        paddingHorizontal: 0,
                        paddingBottom: 1,
                    }}
                    ItemSeparatorComponent={() => (
                        <View style={style.separator} />
                    )}
                    renderItem={({ item, index }) => {
                        const isRoom = item.kind === 'room'
                        return (
                            <Pressable
                                style={({ pressed }) => [
                                    style.row,
                                    pressed && style.rowPressed,
                                    index === list.length - 1 && style.rowLast,
                                ]}
                                android_ripple={{
                                    color: theme.colors.primary05,
                                }}
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
                                    <ChatAvatar
                                        user={item}
                                        size={AvatarSize.md}
                                    />
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
            </NativeViewGestureHandler>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignSelf: 'stretch',
            width: '100%',
            backgroundColor: theme.colors.white,
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
