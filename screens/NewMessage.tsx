import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Image, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { useCommunityContext } from '../state/contexts/CommunityContext'

import type { RootStackParamList } from '../types/navigation'

import { Images } from '../assets/images'
import MembersList from '../components/feature/community/MembersList'
import { useXmpp } from '../state/hooks'

export type Props = NativeStackScreenProps<RootStackParamList, 'NewMessage'>

const NewMessage: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { state, dispatch } = useCommunityContext()
    const { enterMucRoom, sendGroupMessage } = useXmpp()
    const [usernameFilter, setUsernameFilter] = useState<string>('')

    // Subscribe to new messages
    // Fetch any unreceived messages

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
                    <Image source={Images.Scan} style={styles(theme).icon} />
                </View>
                <Pressable
                    style={styles(theme).createRoomContainer}
                    onPress={() => {
                        navigation.replace('JoinRoom')
                    }}>
                    <Image
                        source={Images.SocialPeople}
                        style={styles(theme).icon}
                    />
                    <Text medium style={styles(theme).createRoomText}>
                        {t('feature.community.or-join-a-room')}
                    </Text>
                </Pressable>
                <Text small medium style={styles(theme).membersLabel}>
                    {t('words.members')}
                </Text>
                <MembersList members={state.membersSeen} />
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
        createRoomContainer: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingVertical: theme.spacing.lg,
            paddingHorizontal: theme.spacing.xl,
            // backgroundColor: 'lightblue',
        },
        createRoomText: {
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
            // backgroundColor: 'lightpink',
        },
        filterLabel: {
            textAlign: 'left',
        },
        filterMembersTextInputOuter: {
            flex: 1,
            height: 40,
            // backgroundColor: 'purple',
        },
        filterMembersTextInputInner: {
            borderBottomWidth: 0,
            // marginTop: theme.spacing.xxs,
            // backgroundColor: 'green',
        },
        filterMembersTextInput: {
            fontSize: 16,
            // backgroundColor: 'red',
        },
        membersLabel: {
            paddingHorizontal: theme.spacing.xl,
            paddingVertical: theme.spacing.md,
            textAlign: 'left',
            color: theme.colors.darkGrey,
        },
    })

export default NewMessage
