import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import Header from '../../ui/Header'

import { t } from 'i18next'
import { NavigationHook, RootStackParamList } from '../../../types/navigation'
import SvgImage from '../../ui/SvgImage'

type GroupChatRouteProp = RouteProp<RootStackParamList, 'GroupChat'>

const GroupHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const route = useRoute<GroupChatRouteProp>()
    const { group } = route.params

    const headerText = group.name || t('feature.chat.new-group')

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
                    <SvgImage name="NewRoom" />
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
                        <SvgImage
                            name="Video"
                            svgProps={{ stroke: theme.colors.primary }}
                        />
                    </Pressable>
                    <Pressable
                        disabled
                        onPress={() => {}}
                        style={styles(theme).headerIconContainer}>
                        <SvgImage
                            name="Phone"
                            svgProps={{ stroke: theme.colors.primary }}
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
