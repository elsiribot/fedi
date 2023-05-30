import { useIsFocused } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, CheckBox, Text, Theme, useTheme } from '@rneui/themed'
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
    'BroadcastAdminsList'
>

const BroadcastAdminsList: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { group } = route.params
    const insets = useSafeAreaInsets()
    const { theme } = useTheme()
    const isFocused = useIsFocused()
    const { toast } = useEnvironmentContext().state
    const { fetchGroupMembersList, removeAdminFromGroup } = useXmpp()
    const [admins, setAdmins] = useState<ChatMember[]>([])

    const refreshAdminList = useCallback(async () => {
        const groupParticipants = await fetchGroupMembersList(
            group,
            XmppMemberRole.participant,
        )
        setAdmins(groupParticipants)
    }, [])

    useEffect(() => {
        if (isFocused) {
            refreshAdminList()
        }
    }, [isFocused])

    const handleRemoveAdmin = (member: Member) => {
        Alert.alert(
            t('phrases.please-confirm'),
            t('feature.chat.confirm-remove-admin-from-group', {
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
                            await removeAdminFromGroup(member, group)
                            refreshAdminList()
                            toast?.show(
                                t('feature.chat.removed-admin-from-group', {
                                    username: member.username,
                                }),
                                3000,
                            )
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
        const member = new Member({ jid: jid(item.id) })
        return (
            <MemberItem
                member={member}
                selectMember={handleRemoveAdmin}
                actionIcon={
                    <CheckBox
                        checked={true}
                        onPress={() => handleRemoveAdmin(member)}
                    />
                }
            />
        )
    }

    return (
        <View style={styles(theme, insets).container}>
            <Text h2 h2Style={styles(theme, insets).headerText}>
                {t('feature.chat.admin-settings')}
            </Text>
            <Text caption medium style={styles(theme, insets).instructions}>
                {t('feature.chat.admin-settings-instructions')}
            </Text>
            <View style={styles(theme, insets).membersListContainer}>
                <FlatList
                    data={admins}
                    renderItem={renderMember}
                    keyExtractor={(item: ChatMember) => `${item.id}`}
                    style={styles(theme, insets).membersListContainer}
                />
            </View>
            <Button
                fullWidth
                containerStyle={styles(theme, insets).buttonContainer}
                title={t('feature.chat.add-admin')}
                onPress={() =>
                    navigation.navigate('AddBroadcastAdmin', {
                        group,
                    })
                }
            />
        </View>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            padding: theme.spacing.xl,
        },
        headerText: {
            marginBottom: theme.spacing.sm,
        },
        instructions: {
            lineHeight: 20,
        },
        membersListContainer: {
            flex: 1,
            // backgroundColor: 'pink',
            // marginBottom: insets.bottom,
        },
        buttonContainer: {
            marginTop: 'auto',
            // backgroundColor: 'lightblue',
        },
    })

export default BroadcastAdminsList
