import { useNavigation } from '@react-navigation/native'
import { Theme, useTheme } from '@rneui/themed'
import { t } from 'i18next'
import React from 'react'
import { Dimensions, FlatList, ListRenderItem, StyleSheet } from 'react-native'

import { DEFAULT_GROUP_NAME } from '../../../constants'
import { useCommunityContext } from '../../../state/contexts/CommunityContext'
import { Chat, ChatType, Group, Message, MSats } from '../../../types'
import { NavigationHook } from '../../../types/navigation'
import amountUtils from '../../../utils/AmountUtils'
import ChatTile from './ChatTile'

const WINDOW_WIDTH = Dimensions.get('window').width

const ChatsList: React.FC<{}> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const { authenticatedMember, groups, messages } =
        useCommunityContext().state

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
                                    chat.name || DEFAULT_GROUP_NAME,
                                ),
                            }),
                        })
                    }
                }}
            />
        )
    }

    // console.debug('messages', messages)
    const directMessages = messages.filter(m => !m.sentIn)
    // console.debug('directMessages', directMessages)

    // Produce a set of direct chats from all direct messages
    const directChats: Chat[] = authenticatedMember?.username
        ? directMessages.reduce((chatsResult: Chat[], m: Message) => {
              // Determine the other member that is not the authenticatedMember
              // since they may have sent or received the message
              let otherMember = m.sentTo
              if (m.sentTo?.username === authenticatedMember?.username) {
                  otherMember = m.sentBy
              }
              const existingChatIndex = chatsResult.findIndex(
                  c => c.id === otherMember?.username,
              )

              if (existingChatIndex === -1) {
                  // Add the chat if it doesn't exist
                  chatsResult.push(
                      new Chat({
                          id: otherMember?.username,
                          name: otherMember?.username,
                          members: [otherMember],
                          type: ChatType.direct,
                          lastReceivedTimestamp: m.sentAt,
                          // If last message is a payment, render details
                          messagePreview: m.payment
                              ? t('feature.community.payment-requested', {
                                    name: m.sentBy?.username,
                                    amount: amountUtils.formatNumber(
                                        amountUtils.msatToSat(
                                            m.payment.amount as MSats,
                                        ),
                                    ),
                                    unit: 'SATS',
                                })
                              : m.content,
                      }),
                  )
                  return chatsResult
              } else {
                  // Chat exists, check if message previews should be updated
                  const updatedChat = chatsResult[existingChatIndex]
                  if (updatedChat.lastReceivedTimestamp! < m.sentAt!) {
                      updatedChat.lastReceivedTimestamp = m.sentAt
                      // If last message is a payment, render details
                      updatedChat.messagePreview = m.payment
                          ? t('feature.community.payment-requested', {
                                name: m.sentBy?.username,
                                amount: amountUtils.formatNumber(
                                    amountUtils.msatToSat(
                                        m.payment.amount as MSats,
                                    ),
                                ),
                                unit: 'SATS',
                            })
                          : m.content

                      chatsResult = chatsResult.map((c: Chat, i) =>
                          i === existingChatIndex ? updatedChat : c,
                      )
                  }
              }
              return chatsResult
          }, [] as Chat[])
        : []
    // console.debug('directChats', directChats)

    return (
        <FlatList
            style={styles(theme).container}
            data={[...groups, ...directChats]}
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
