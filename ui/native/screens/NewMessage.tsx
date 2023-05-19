import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Input, Text, Theme, useTheme } from '@rneui/themed'
import { jid } from '@xmpp/client'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import MembersList from '../components/feature/chat/MembersList'
import SvgImage from '../components/ui/SvgImage'
import { useChatContext } from '../state/contexts/ChatContext'
import { useDebouncedEffect } from '../state/hooks'
import { useXmpp } from '../state/hooks/chat'
import { Member } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'NewMessage'>

const NewMessage: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const insets = useSafeAreaInsets()
    const { theme } = useTheme()
    const { fetchRoster } = useXmpp()
    const { membersSeen, authenticatedMember, connectionOptions } =
        useChatContext().state
    const [usernameFilter, setUsernameFilter] = useState<string>('')

    // filter out members if usernameFilter has text to filter with
    const filteredMembers = usernameFilter
        ? membersSeen.filter(m => m.username.includes(usernameFilter))
        : membersSeen

    useDebouncedEffect(
        () => {
            if (usernameFilter.length > 1 && authenticatedMember) {
                fetchRoster()
            }
        },
        [usernameFilter, authenticatedMember, fetchRoster],
        500,
    )

    const showSendMessage = usernameFilter.length > 1

    return (
        <View style={styles(theme, insets).container}>
            <View style={styles(theme, insets).contentContainer}>
                <View style={styles(theme, insets).filterMembersContainer}>
                    <Text
                        medium
                        caption
                        style={styles(theme, insets).filterLabel}>
                        {`${t('words.to')}:`}
                    </Text>
                    <Input
                        onChangeText={setUsernameFilter}
                        value={usernameFilter}
                        placeholder={`${t('feature.chat.enter-a-username')}`}
                        returnKeyType="done"
                        containerStyle={
                            styles(theme, insets).filterMembersTextInputOuter
                        }
                        inputContainerStyle={
                            styles(theme, insets).filterMembersTextInputInner
                        }
                        style={styles(theme, insets).filterMembersTextInput}
                        autoCapitalize={'none'}
                        autoCorrect={false}
                    />
                    <Pressable
                        onPress={() => navigation.navigate('ScanMemberCode')}
                        hitSlop={5}>
                        <SvgImage name="Scan" />
                    </Pressable>
                </View>
                <Pressable
                    style={styles(theme, insets).createGroupContainer}
                    onPress={() => {
                        navigation.replace('JoinGroup')
                    }}>
                    <SvgImage name="Room" />
                    <Text medium style={styles(theme, insets).createGroupText}>
                        {t('feature.chat.create-or-join-a-new-group')}
                    </Text>
                </Pressable>
                {showSendMessage && (
                    <Pressable
                        style={styles(theme, insets).createGroupContainer}
                        onPress={async () => {
                            if (connectionOptions) {
                                const { domain, resource } = connectionOptions
                                const newMember = new Member({
                                    jid: jid(
                                        `${usernameFilter}@${domain}/${resource}`,
                                    ),
                                })
                                navigation.replace('DirectChat', {
                                    member: newMember,
                                })
                            }
                        }}>
                        <SvgImage name="SocialPeople" />
                        <Text
                            medium
                            style={styles(theme, insets).createGroupText}>
                            {`Send a message to ${usernameFilter}`}
                        </Text>
                    </Pressable>
                )}
                <Text small medium style={styles(theme, insets).membersLabel}>
                    {t('words.members')}
                </Text>
                <View style={styles(theme, insets).membersListContainer}>
                    <MembersList members={filteredMembers} />
                </View>
            </View>
            {/* <MessageInput onMessageSubmitted={messageText => {}} /> */}
        </View>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
        },
        contentContainer: {
            flex: 1,
            width: '100%',
        },
        createGroupContainer: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingVertical: theme.spacing.lg,
            paddingHorizontal: theme.spacing.xl,
        },
        createGroupText: {
            marginLeft: theme.spacing.md,
        },
        filterMembersContainer: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.xl,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.grey,
        },
        filterLabel: {
            textAlign: 'left',
        },
        filterMembersTextInputOuter: {
            flex: 1,
            height: 40,
        },
        filterMembersTextInputInner: {
            borderBottomWidth: 0,
        },
        filterMembersTextInput: {
            fontSize: 16,
        },
        membersLabel: {
            paddingHorizontal: theme.spacing.xl,
            paddingVertical: theme.spacing.md,
            textAlign: 'left',
            color: theme.colors.darkGrey,
        },
        membersListContainer: {
            flex: 1,
            marginBottom: insets.bottom,
        },
    })

export default NewMessage
