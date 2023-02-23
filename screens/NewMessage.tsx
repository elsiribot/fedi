import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import MembersList from '../components/feature/chat/MembersList'
import SvgImage from '../components/ui/SvgImage'
import { FEDI_GENERAL_CHANNEL_GROUP } from '../constants'
import { useChatContext } from '../state/contexts/ChatContext'
import { useXmpp } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'NewMessage'>

const NewMessage: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const insets = useSafeAreaInsets()
    const { theme } = useTheme()
    const { enterMucRoom } = useXmpp()
    const { state } = useChatContext()
    const [usernameFilter, setUsernameFilter] = useState<string>('')
    const { authenticatedMember } = useChatContext().state

    // filter out members if usernameFilter has text to filter with
    const filteredMembers = usernameFilter
        ? state.membersSeen.filter(m => m.username.includes(usernameFilter))
        : state.membersSeen

    useEffect(() => {
        if (authenticatedMember) {
            // This is a temporary measure to improve member discovery...
            // all users announce presence in this MUC room even without clicking it
            // so that presence messages for each new user are sent to all other users
            enterMucRoom(FEDI_GENERAL_CHANNEL_GROUP)
        }
    }, [authenticatedMember, enterMucRoom])

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
                    <SvgImage name="Scan" containerStyle={{ opacity: 0.1 }} />
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
