import { useNavigation } from '@react-navigation/native'
import { Theme, useTheme } from '@rneui/themed'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, FlatList, ListRenderItem, StyleSheet } from 'react-native'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import {
    getLatestMessageIdsForChats,
    jidToId,
    makePaymentText,
} from '@fedi/common/utils/chat'

import { useChatContext } from '../../../state/contexts/ChatContext'
import { Chat, ChatType, Group, Member, Message } from '../../../types'
import { NavigationHook } from '../../../types/navigation'
import ChatTile from './ChatTile'

const WINDOW_WIDTH = Dimensions.get('window').width

const ChatsList: React.FC<{}> = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const {
        groups,
        messages,
        membersSeen,
        authenticatedMember,
        lastReadMessageIds,
    } = useChatContext().state

    // Assemble a map of which chats are unread
    const unreadChatMap = useMemo(() => {
        if (!authenticatedMember?.jid) return {}
        const latestMessageIds = getLatestMessageIdsForChats(
            messages,
            jidToId(authenticatedMember.jid),
        )
        return Object.keys(latestMessageIds).reduce((prev, chatId) => {
            // If not found in lastReadMessageIds, consider unread.
            // If found and not matching, consider unread.
            prev[chatId] = lastReadMessageIds[chatId]
                ? lastReadMessageIds[chatId] !== latestMessageIds[chatId]
                : true
            return prev
        }, {} as Record<string, boolean | undefined>)
    }, [authenticatedMember, messages, lastReadMessageIds])

    const renderChat: ListRenderItem<Chat> = ({ item }) => {
        const directMember =
            item.members && item.members?.length === 1 && item.members[0]
        const id = directMember ? jidToId(directMember.jid) : item.id
        return (
            <ErrorBoundary fallback={null}>
                <ChatTile
                    chat={item}
                    unread={!!unreadChatMap[id]}
                    selectChat={(chat: Chat) => {
                        if (directMember) {
                            navigation.navigate('DirectChat', {
                                member: directMember,
                            })
                        } else {
                            navigation.navigate('GroupChat', {
                                group: new Group({
                                    id: chat.id,
                                    name: chat.name,
                                    invitationCode: Group.encodeInvitationLink(
                                        chat.id,
                                    ),
                                }),
                            })
                        }
                    }}
                />
            </ErrorBoundary>
        )
    }

    const pinnedGroups = groups.filter(group => group.pinned === true)
    const unpinnedGroups = groups.filter(group => group.pinned !== true)
    const directMessages = messages.filter(m => !m.sentIn)

    // Produce a set of direct chats from all direct messages
    const directChats: Chat[] = authenticatedMember?.username
        ? membersSeen.reduce((chatsResult: Chat[], m: Member) => {
              const messagesWithMember = directMessages.filter(
                  dm =>
                      dm.sentBy?.username === m.username ||
                      dm.sentTo?.username === m.username,
              )
              // Do not add to the chats list if there are no messages
              // with this member
              if (messagesWithMember.length === 0) {
                  return chatsResult
              }

              // Find the latest message to show as a preview
              const lastMessageWithMember: Message = messagesWithMember.reduce(
                  (latestMessage: Message, dm: Message) => {
                      if (dm.sentAt! > latestMessage.sentAt!) {
                          return dm
                      } else {
                          return latestMessage
                      }
                  },
                  messagesWithMember[0],
              )

              const { sentAt, payment, sentTo, sentBy, content } =
                  lastMessageWithMember

              chatsResult.push(
                  new Chat({
                      id: m.username,
                      name: m.username,
                      members: [m],
                      type: ChatType.direct,
                      lastReceivedTimestamp: sentAt,
                      // If last message is a payment, render details
                      messagePreview: payment
                          ? makePaymentText(
                                t,
                                sentBy?.username || '',
                                sentTo?.username || '',
                                authenticatedMember.username,
                                payment?.recipient?.username,
                                payment?.amount,
                                payment?.memo,
                            )
                          : content,
                  }),
              )
              return chatsResult
          }, [] as Chat[])
        : []

    const sortedChats = directChats.concat(unpinnedGroups)
    sortedChats.sort((a, b) => {
        if (!a.lastReceivedTimestamp) return -1
        if (!b.lastReceivedTimestamp) return 1
        if (a.lastReceivedTimestamp && b.lastReceivedTimestamp) {
            return b.lastReceivedTimestamp - a.lastReceivedTimestamp
        }
        return 0
    })

    return (
        <FlatList
            style={styles(theme).container}
            data={[...pinnedGroups, ...sortedChats]}
            renderItem={renderChat}
            keyExtractor={(item: Chat) => `${item.id}`}
            // optimization that allows skipping the measurement of dynamic content
            // for fixed-size list items
            getItemLayout={(data, index) => ({
                length: WINDOW_WIDTH,
                offset: 48 * index,
                index,
            })}
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            paddingRight: theme.spacing.md,
        },
    })

export default ChatsList
