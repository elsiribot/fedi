import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { useCommunityContext } from '../state/contexts/CommunityContext'

import type { RootStackParamList } from '../types/navigation'

import MembersList from '../components/feature/community/MembersList'
import SvgImage from '../components/ui/SvgImage'
import { FEDI_GENERAL_CHANNEL_GROUP } from '../constants'
import { useXmpp } from '../state/hooks'

export type Props = NativeStackScreenProps<RootStackParamList, 'NewMessage'>

const NewMessage: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { enterMucRoom } = useXmpp()
    const { state } = useCommunityContext()
    const [usernameFilter, setUsernameFilter] = useState<string>('')
    const { authenticatedMember } = useCommunityContext().state

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
        <View style={styles(theme).container}>
            <View style={styles(theme).contentContainer}>
                <View style={styles(theme).filterMembersContainer}>
                    <Text medium caption style={styles(theme).filterLabel}>
                        {`${t('words.to')}:`}
                    </Text>
                    <Input
                        onChangeText={setUsernameFilter}
                        value={usernameFilter}
                        placeholder={`${t(
                            'feature.community.enter-a-username',
                        )}`}
                        returnKeyType="done"
                        containerStyle={
                            styles(theme).filterMembersTextInputOuter
                        }
                        inputContainerStyle={
                            styles(theme).filterMembersTextInputInner
                        }
                        style={styles(theme).filterMembersTextInput}
                        autoCapitalize={'none'}
                        autoCorrect={false}
                    />
                    <SvgImage name="Scan" containerStyle={{ opacity: 0.1 }} />
                </View>
                <Pressable
                    style={styles(theme).createGroupContainer}
                    onPress={() => {
                        navigation.replace('JoinGroup')
                    }}>
                    <SvgImage name="Room" />
                    <Text medium style={styles(theme).createGroupText}>
                        {t('feature.community.create-or-join-a-new-group')}
                    </Text>
                </Pressable>
                <Text small medium style={styles(theme).membersLabel}>
                    {t('words.members')}
                </Text>
                <MembersList members={filteredMembers} />
            </View>
            {/* <MessageInput onMessageSubmitted={messageText => {}} /> */}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
        },
        contentContainer: {
            width: '100%',
        },
        icon: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
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
    })

export default NewMessage
