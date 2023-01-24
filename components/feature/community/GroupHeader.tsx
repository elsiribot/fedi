import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { Image, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { Images } from '../../../assets/images'
import Header from '../../ui/Header'

import { t } from 'i18next'
import { NavigationHook, RootStackParamList } from '../../../types/navigation'

type GroupChatRouteProp = RouteProp<RootStackParamList, 'GroupChat'>

const GroupHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const route = useRoute<GroupChatRouteProp>()
    const { group } = route.params

    // Mocked groupLink format: fedi:group:uniqueGroupId::userDefinedGroupName
    // If userDefinedGroupName is not provided, assume it is a new group
    const headerText = group.name || t('feature.community.new-group')

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
                        navigation.navigate('GroupAdmin', { group })
                    }}>
                    <Image
                        style={styles(theme).groupIcon}
                        source={Images.NewRoom}
                    />
                    <Text bold style={styles(theme).groupNameText}>
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
                        <Image
                            style={styles(theme).headerIcon}
                            source={Images.Video}
                        />
                    </Pressable>
                    <Pressable
                        disabled
                        onPress={() => {}}
                        style={styles(theme).headerIconContainer}>
                        <Image
                            style={styles(theme).headerIcon}
                            source={Images.Phone}
                        />
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
        headerIcon: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        groupNameText: {
            marginLeft: theme.spacing.sm,
        },
        groupIcon: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        groupNameContainer: {
            padding: theme.spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
        },
    })

export default GroupHeader
