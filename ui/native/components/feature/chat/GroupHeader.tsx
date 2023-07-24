import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import { t } from 'i18next'
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { selectChatGroup } from '@fedi/common/redux'
import { ChatGroup } from '@fedi/common/types'

import { useAppSelector } from '../../../state/hooks'
import { NavigationHook, RootStackParamList } from '../../../types/navigation'
import { AvatarSize } from '../../ui/Avatar'
import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'
import GroupIcon from './GroupIcon'

type GroupChatRouteProp = RouteProp<RootStackParamList, 'GroupChat'>

const GroupHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const route = useRoute<GroupChatRouteProp>()
    const { groupId } = route.params
    const group = useAppSelector(s => selectChatGroup(s, groupId))

    const headerText = group?.name || t('feature.chat.new-group')

    return (
        <Header
            backButton
            containerStyle={styles(theme).container}
            centerContainerStyle={styles(theme).headerCenterContainer}
            headerCenter={
                <Pressable
                    // if this is a DirectChat, header press is disabled
                    disabled={group === undefined}
                    style={styles(theme).groupNameContainer}
                    onPress={() => {
                        navigation.navigate('GroupAdmin', { groupId })
                    }}>
                    <GroupIcon chat={group as ChatGroup} size={AvatarSize.sm} />
                    <Text
                        bold
                        numberOfLines={1}
                        style={styles(theme).groupNameText}>
                        {headerText}
                    </Text>
                </Pressable>
            }
            rightContainerStyle={styles(theme).headerRightContainer}
            headerRight={
                <>
                    <Pressable
                        disabled
                        onPress={() => {}}
                        style={styles(theme).headerIconContainer}>
                        <SvgImage name="Video" color={theme.colors.primary} />
                    </Pressable>
                    <Pressable
                        disabled
                        onPress={() => {}}
                        style={styles(theme).headerIconContainer}>
                        <SvgImage name="Phone" color={theme.colors.primary} />
                    </Pressable>
                </>
            }
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            marginTop: theme.spacing.md,
        },
        headerCenterContainer: {
            flex: 6,
            justifyContent: 'flex-start',
        },
        headerRightContainer: {
            flex: 3,
            flexDirection: 'row',
            justifyContent: 'flex-end',
        },
        headerIconContainer: {
            padding: theme.spacing.sm,
            // Disabled
            opacity: 0.25,
        },
        groupNameText: {
            marginLeft: theme.spacing.sm,
        },
        groupIcon: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        groupNameContainer: {
            width: '95%',
            padding: theme.spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
        },
    })

export default GroupHeader
