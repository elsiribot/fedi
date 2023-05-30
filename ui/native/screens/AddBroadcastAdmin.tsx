import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Input, Theme, useTheme } from '@rneui/themed'
import { jid } from '@xmpp/client'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, FlatList, ListRenderItem, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import { XmppMemberRole } from '@fedi/common/utils/XmlUtils'

import MemberItem from '../components/feature/chat/MemberItem'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useXmpp } from '../state/hooks/chat'
import { ChatMember, Member } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'AddBroadcastAdmin'
>

const AddBroadcastAdmin: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { group } = route.params
    const insets = useSafeAreaInsets()
    const { theme } = useTheme()
    const { toast } = useEnvironmentContext().state
    const { fetchGroupMembersList, addAdminToGroup } = useXmpp()
    const [usernameFilter, setUsernameFilter] = useState<string>('')
    const [visitors, setVisitors] = useState<ChatMember[]>([])

    // filter out members if usernameFilter has text to filter with
    const filteredMembers = usernameFilter
        ? visitors.filter(m => m.username.includes(usernameFilter))
        : visitors

    const refreshVisitorList = useCallback(async () => {
        const groupVisitors = await fetchGroupMembersList(
            group,
            XmppMemberRole.visitor,
        )
        setVisitors(groupVisitors)
    }, [])

    useEffect(() => {
        refreshVisitorList()
    }, [])

    const handleAddAdmin = async (member: Member) => {
        Alert.alert(
            t('phrases.please-confirm'),
            t('feature.chat.confirm-add-admin-to-group', {
                username: member.username,
            }),
            [
                {
                    text: t('words.cancel'),
                },
                {
                    text: t('words.yes'),
                    onPress: async () => {
                        try {
                            await addAdminToGroup(member, group)
                            toast?.show(
                                t('feature.chat.added-admin-to-group', {
                                    username: member.username,
                                }),
                                3000,
                            )
                            navigation.goBack()
                        } catch (error) {
                            console.error(error)
                            toast?.show(t('errors.unknown-error'), 3000)
                        }
                    },
                },
            ],
        )
    }

    const renderMember: ListRenderItem<ChatMember> = ({ item }) => {
        return (
            <MemberItem
                member={new Member({ jid: jid(item.id) })}
                selectMember={handleAddAdmin}
            />
        )
    }

    return (
        <View style={styles(theme, insets).container}>
            <View style={styles(theme, insets).filterMembersContainer}>
                <Input
                    onChangeText={setUsernameFilter}
                    value={usernameFilter}
                    placeholder={`${t(
                        'feature.chat.type-to-search-members',
                    )}...`}
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
                    autoFocus
                />
                {/* TODO: implement Add Admin by scanning their member code */}
                {/* <Pressable
                    onPress={() => navigation.navigate('ScanMemberCode')}
                    hitSlop={5}>
                    <SvgImage name="Scan" />
                </Pressable> */}
            </View>
            <View style={styles(theme, insets).membersListContainer}>
                <FlatList
                    data={filteredMembers}
                    renderItem={renderMember}
                    keyExtractor={(item: ChatMember) => `${item.id}`}
                    style={styles(theme, insets).membersList}
                />
            </View>
        </View>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            paddingVertical: theme.spacing.xl,
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
        membersListContainer: {
            padding: theme.spacing.xl,
            // flex: 1,
            // backgroundColor: 'pink',
            // marginBottom: insets.bottom,
        },
        membersList: {
            // flex: 1,
            // backgroundColor: 'pink',
            // marginBottom: insets.bottom,
        },
    })

export default AddBroadcastAdmin
