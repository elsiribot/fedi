import { useNavigation } from '@react-navigation/native'
import { Theme, useTheme } from '@rneui/themed'
import { t } from 'i18next'
import React from 'react'
import { Dimensions, FlatList, ListRenderItem, StyleSheet } from 'react-native'

import amountUtils from '@fedi/common/utils/AmountUtils'

import { useChatContext } from '../../../state/contexts/ChatContext'
import { Chat, ChatType, Group, Member, Message, MSats } from '../../../types'
import { NavigationHook } from '../../../types/navigation'
import ChatTile from './ChatTile'

const WINDOW_WIDTH = Dimensions.get('window').width

const ChatsList: React.FC<{}> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const { authenticatedMember, groups, messages, membersSeen } =
        useChatContext().state

    const renderChat: ListRenderItem<Chat> = ({ item }) => {
        return (
            <ChatTile
                chat={item}
                selectChat={(chat: Chat) => {
                    if (chat.members?.length === 1) {
                        navigation.navigate('DirectChat', {
                            member: chat.members[0],
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

              const { sentAt, payment, sentBy, content } = lastMessageWithMember

              chatsResult.push(
                  new Chat({
                      id: m.username,
                      name: m.username,
                      members: [m],
                      type: ChatType.direct,
                      lastReceivedTimestamp: sentAt,
                      // If last message is a payment, render details
                      messagePreview: payment
                          ? t('feature.chat.payment-requested', {
                                name: sentBy?.username,
                                amount: amountUtils.formatNumber(
                                    amountUtils.msatToSat(
                                        payment.amount as MSats,
                                    ),
                                ),
                                unit: 'SATS',
                            })
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
