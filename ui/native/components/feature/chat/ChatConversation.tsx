import { useNavigation } from '@react-navigation/native'
import { Theme, useTheme, Text } from '@rneui/themed'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Animated,
    Easing,
    FlatList,
    ListRenderItem,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    StyleSheet,
    View,
} from 'react-native'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import { useObserveMatrixRoom } from '@fedi/common/hooks/matrix'
import {
    paginateMatrixRoomTimeline,
    selectMatrixAuth,
    selectMatrixRoom,
    selectMatrixRoomIsReadOnly,
    selectMatrixUser,
} from '@fedi/common/redux'
import { ChatMessage, ChatType, MatrixEvent } from '@fedi/common/types'
import dateUtils from '@fedi/common/utils/DateUtils'
import { jidToId } from '@fedi/common/utils/chat'
import {
    MatrixEventContent,
    makeMatrixEventGroups,
} from '@fedi/common/utils/matrix'

import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import Avatar from '../../ui/Avatar'
import ChatEventCollection from './ChatEventCollection'
import EmptyGroupNotice from './EmptyGroupNotice'
import MessageItem from './MessageItem'
import { MessageItemError } from './MessageItemError'

type MessagesListProps = {
    type: ChatType
    id: string
    events: MatrixEvent[]
    multiUserChat?: boolean
}

const ChatConversation: React.FC<MessagesListProps> = ({
    type,
    id,
    events,
    multiUserChat = false,
}: MessagesListProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const [hasPaginated, setHasPaginated] = useState(false)
    const [isPaginating, setIsPaginating] = useState(false)
    const [isAtEnd, setIsAtEnd] = useState(false)
    const matrixAuth = useAppSelector(selectMatrixAuth)
    const listRef = useRef<FlatList>(null)
    const lastScrolledMessageIdRef = useRef(events?.[0]?.id)
    const isScrolledToBottomRef = useRef(true)
    const myId = useMemo(() => matrixAuth?.userId, [matrixAuth])
    const [hasNewMessage, setHasNewMessages] = useState(false)
    const animatedNewMessageBottom = useRef(new Animated.Value(0)).current
    const dispatch = useAppDispatch()

    useObserveMatrixRoom(id)

    const eventGroups = useMemo(
        () => makeMatrixEventGroups(events, 'desc'),
        [events],
    )

    // Any time we get a change in the number of events, we reset hasPaginated
    // so that the user will attempt pagination again.
    useEffect(() => {
        setHasPaginated(false)
    }, [events.length])

    const style = styles(theme)

    // Animate new message button in and out
    useEffect(() => {
        Animated.timing(animatedNewMessageBottom, {
            toValue: hasNewMessage ? 90 : -50,
            duration: 100,
            useNativeDriver: false,
            easing: Easing.linear,
        }).start()
    }, [animatedNewMessageBottom, hasNewMessage])

    const scrollToEnd = useCallback(() => {
        // Use scrollToOffset instead of scrollToEnd because the list is inverted
        listRef.current?.scrollToOffset({ offset: 0, animated: true })
        setHasNewMessages(false)
    }, [])

    // When new messages come in, either scroll to the bottom (if we sent)
    // or pop up a notice that we have new messages.
    useEffect(() => {
        if (!myId || !eventGroups.length) return
        // Bail out if we've already handled this message
        const lastMessage = eventGroups[0]?.[0]?.[0]
        const shouldScroll =
            lastMessage && lastMessage.id !== lastScrolledMessageIdRef.current
        if (!shouldScroll) return
        // Update ref so we don't scroll again
        lastScrolledMessageIdRef.current = lastMessage.id
        // If we sent it, or we're already at the bottom, scroll without asking
        if (lastMessage.senderId === myId || isScrolledToBottomRef.current) {
            return
        }
        // Otherwise, mark that we have new messages
        else {
            setHasNewMessages(true)
        }
    }, [eventGroups, myId, scrollToEnd])

    const handlePaginate = useCallback(async () => {
        if (isPaginating || hasPaginated || isAtEnd) return
        setIsPaginating(true)
        setHasPaginated(true)
        dispatch(paginateMatrixRoomTimeline({ roomId: id, limit: 10 }))
            .unwrap()
            .then(({ end }) => setIsAtEnd(end))
            .catch(() => console.error('error paginating'))
            .finally(() => setIsPaginating(false))
    }, [id, dispatch, isPaginating, hasPaginated, isAtEnd])

    // Mark hasNewMessages as false when we scroll to the bottom, and keep a ref up to date
    const handleScroll = useCallback(
        (ev: NativeSyntheticEvent<NativeScrollEvent>) => {
            const isAtBottom = ev.nativeEvent.contentOffset.y <= 10
            isScrolledToBottomRef.current = isAtBottom
            if (isAtBottom) {
                setHasNewMessages(false)
            }
        },
        [],
    )

    const ChatEventCollectionMemo = React.memo(
        ChatEventCollection,
        (prevProps, nextProps) => {
            return (
                prevProps.collection[0][0].id === nextProps.collection[0][0].id
            )
        },
    )
    const renderEventGroup: ListRenderItem<
        MatrixEvent<MatrixEventContent>[][]
    > = useCallback(({ item }) => {
        return (
            <ChatEventCollectionMemo
                key={item[0][0].id}
                roomId={id}
                collection={item}
                showUsernames={type === ChatType.group}
            />
        )
    }, [])

    return (
        <>
            <FlatList
                data={eventGroups}
                ref={listRef}
                renderItem={renderEventGroup}
                keyExtractor={item => `${item[0][0]?.id}`}
                style={[
                    style.listContainer,
                    {
                        paddingHorizontal:
                            type === 'group'
                                ? theme.spacing.lg
                                : theme.spacing.xl,
                    },
                ]}
                contentContainerStyle={style.contentContainer}
                removeClippedSubviews={false}
                ListEmptyComponent={
                    type === ChatType.group ? <EmptyGroupNotice /> : null
                }
                onScroll={handleScroll}
                // adjust this for more/less aggressive loading
                onEndReachedThreshold={1}
                inverted={events.length > 0}
                onEndReached={handlePaginate}
                refreshing={isPaginating}
                maintainVisibleContentPosition={{
                    minIndexForVisible: 1,
                    autoscrollToTopThreshold: 100,
                }}
                scrollsToTop={false}
            />
            <Animated.View
                style={[
                    style.newMessageButtonContainer,
                    { bottom: animatedNewMessageBottom },
                ]}>
                <Pressable style={style.newMessageButton} onPress={scrollToEnd}>
                    <Text small bold style={style.newMessageButtonText}>
                        {t('feature.chat.new-messages')}
                    </Text>
                </Pressable>
            </Animated.View>
        </>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        listContainer: {
            width: '100%',
            paddingHorizontal: theme.spacing.xl,
        },
        contentContainer: {
            paddingTop: theme.spacing.md,
        },
        newMessageButtonContainer: {
            position: 'absolute',
            left: 0,
            right: 0,
            alignItems: 'center',
        },
        newMessageButton: {
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
            backgroundColor: theme.colors.primary,
            borderRadius: 30,
        },
        newMessageButtonText: {
            color: theme.colors.secondary,
        },
    })

export default ChatConversation
