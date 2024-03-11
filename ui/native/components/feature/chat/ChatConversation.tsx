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
import {
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

import { useAppSelector } from '../../../state/hooks'
import Avatar from '../../ui/Avatar'
import ChatEventCollection from './ChatEventCollection'
import EmptyGroupNotice from './EmptyGroupNotice'
import MessageItem from './MessageItem'
import { MessageItemError } from './MessageItemError'

type MessagesListProps = {
    type: ChatType
    id: string
    name: string
    events: MatrixEvent[]
    onSendMessage?(message: string): Promise<void>
    onPaginate?: () => Promise<{ end: boolean }>
    messages?: ChatMessage[][][]
    multiUserChat?: boolean
}

const ChatConversation: React.FC<MessagesListProps> = ({
    type,
    id,
    name,
    events,
    onSendMessage,
    onPaginate,
    messages,
    multiUserChat = false,
}: MessagesListProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation()

    const room = useAppSelector(s => selectMatrixRoom(s, id))
    const user = useAppSelector(s => selectMatrixUser(s, id))
    const isReadOnly = useAppSelector(s => selectMatrixRoomIsReadOnly(s, id))
    const [hasPaginated, setHasPaginated] = useState(false)
    const [isPaginating, setIsPaginating] = useState(false)
    const [isAtEnd, setIsAtEnd] = useState(false)

    const eventGroups = useMemo(
        () => makeMatrixEventGroups(events, 'desc'),
        [events],
    )
    console.info('room', room)
    console.info('user', user)
    console.info('eventGroups', eventGroups)

    // Any time we get a change in the number of events, we reset hasPaginated
    // so that the user will attempt pagination again.
    useEffect(() => {
        setHasPaginated(false)
    }, [events.length])

    const listRef = useRef<FlatList>(null)
    // const lastScrolledMessageIdRef = useRef(messages[0]?.[0]?.[0].id)
    const isScrolledToBottomRef = useRef(true)
    // const authenticatedMember = useAppSelector(selectAuthenticatedMember)
    // const memberMap = useAppSelector(selectChatMemberMap)
    const [hasNewMessage, setHasNewMessages] = useState(false)
    const animatedNewMessageBottom = useRef(new Animated.Value(0)).current

    const style = styles(theme)
    // const myId = authenticatedMember?.id || ''

    // Animate new message button in and out
    // useEffect(() => {
    //     Animated.timing(animatedNewMessageBottom, {
    //         toValue: hasNewMessage ? 90 : -50,
    //         duration: 100,
    //         useNativeDriver: false,
    //         easing: Easing.linear,
    //     }).start()
    // }, [animatedNewMessageBottom, hasNewMessage])

    // const scrollToEnd = useCallback(() => {
    //     // Use scrollToOffset instead of scrollToEnd because the list is inverted
    //     listRef.current?.scrollToOffset({ offset: 0, animated: true })
    //     setHasNewMessages(false)
    // }, [])

    // When new messages come in, either scroll to the bottom (if we sent)
    // or pop up a notice that we have new messages.
    // useEffect(() => {
    //     // Bail out if we've already handled this message
    //     const lastMessage = messages[0]?.[0]?.[0]
    //     const shouldScroll =
    //         lastMessage && lastMessage.id !== lastScrolledMessageIdRef.current
    //     if (!shouldScroll) return

    //     // Update ref so we don't scroll again
    //     lastScrolledMessageIdRef.current = lastMessage.id

    //     // If we sent it, or we're already at the bottom, scroll without asking
    //     if (lastMessage.sentBy === myId || isScrolledToBottomRef.current) {
    //         scrollToEnd()
    //     }
    //     // Otherwise, mark that we have new messages
    //     else {
    //         setHasNewMessages(true)
    //     }
    // }, [messages, myId, scrollToEnd])

    // Mark hasNewMessages as false when we scroll to the bottom, and keep a ref up to date
    const handleScroll = useCallback(
        (ev: NativeSyntheticEvent<NativeScrollEvent>) => {
            const isAtBottom = ev.nativeEvent.contentOffset.y <= 10
            isScrolledToBottomRef.current = isAtBottom
            if (isAtBottom) {
                setHasNewMessages(false)
            }
            console.info(
                'ev.nativeEvent.contentOffset',
                ev.nativeEvent.contentOffset,
            )
        },
        [],
    )

    const renderEventGroup: ListRenderItem<
        MatrixEvent<MatrixEventContent>[][]
    > = ({ item }) => {
        console.info('item', item)
        return (
            <ChatEventCollection
                key={item[0][0].id}
                roomId={id}
                collection={item}
                showUsernames={type === ChatType.group}
            />
        )
    }

    return (
        <>
            <FlatList
                data={eventGroups}
                ref={listRef}
                renderItem={renderEventGroup}
                keyExtractor={item => `${item[0][0]?.id}`}
                style={style.listContainer}
                contentContainerStyle={style.contentContainer}
                removeClippedSubviews={false}
                ListEmptyComponent={multiUserChat ? <EmptyGroupNotice /> : null}
                onScroll={
                    onPaginate && !hasPaginated && !isAtEnd
                        ? handleScroll
                        : undefined
                }
                inverted={eventGroups.length > 0}
            />
            {/* <Animated.View
                style={[
                    style.newMessageButtonContainer,
                    { bottom: animatedNewMessageBottom },
                ]}>
                <Pressable style={style.newMessageButton} onPress={scrollToEnd}>
                    <Text small bold style={style.newMessageButtonText}>
                        {t('feature.chat.new-messages')}
                    </Text>
                </Pressable>
            </Animated.View> */}
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
