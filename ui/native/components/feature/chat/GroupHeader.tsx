import { RouteProp, useRoute } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import { t } from 'i18next'
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { selectChatGroup } from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import { RootStackParamList } from '../../../types/navigation'
import { AvatarSize } from '../../ui/Avatar'
import Header from '../../ui/Header'
import { ChatConnectionBadge } from './ChatConnectionBadge'
import GroupIcon from './GroupIcon'

type GroupChatRouteProp = RouteProp<RootStackParamList, 'GroupChat'>

/** @deprecated XMPP legacy code */
const GroupHeader: React.FC = () => {
    const { theme } = useTheme()
    const route = useRoute<GroupChatRouteProp>()
    const { groupId } = route.params
    const group = useAppSelector(s => selectChatGroup(s, groupId))

    const headerText = group?.name || t('feature.chat.new-group')

    return (
        <>
            <Header
                backButton
                centerContainerStyle={styles(theme).headerCenterContainer}
                headerCenter={
                    <Pressable
                        /** This header is no longer pressable in XMPP read-only view */
                        disabled
                        style={styles(theme).groupNameContainer}>
                        {group && (
                            <GroupIcon chat={group} size={AvatarSize.sm} />
                        )}
                        <Text
                            bold
                            numberOfLines={1}
                            style={styles(theme).groupNameText}>
                            {headerText}
                        </Text>
                    </Pressable>
                }
            />
            <ChatConnectionBadge offset={63} />
        </>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        headerCenterContainer: {
            flex: 6,
            alignItems: 'center',
            justifyContent: 'center',
        },
        groupNameText: {
            marginLeft: theme.spacing.sm,
        },
        groupIcon: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        groupNameContainer: {
            flex: 1,
            padding: theme.spacing.xs,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
    })

export default GroupHeader
