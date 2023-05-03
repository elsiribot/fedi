import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import { selectActiveFederation } from '@fedi/common/redux'

import ChatHeader from '../components/feature/chat/ChatHeader'
import SelectedFederationHeader from '../components/feature/federations/SelectedFederationHeader'
import HomeHeader from '../components/feature/home/HomeHeader'
import SvgImage from '../components/ui/SvgImage'
import { useChatContext } from '../state/contexts/ChatContext'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppSelector } from '../state/hooks'
import {
    RootStackParamList,
    TabsNavigatorParamList,
    TABS_NAVIGATOR_ID,
} from '../types/navigation'
import ChatScreen from './ChatScreen'
import Home from './Home'

export type Props = NativeStackScreenProps<RootStackParamList, 'TabsNavigator'>

const Tab = createBottomTabNavigator<TabsNavigatorParamList>()

const TabsNavigator: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const insets = useSafeAreaInsets()
    const [offline, setOffline] = useState(false)
    const { toast } = useEnvironmentContext().state
    const { connectionOptions } = useChatContext().state
    const activeFederation = useAppSelector(selectActiveFederation)

    const toggleOffline = () => {
        if (!offline) {
            toast?.show('Simulating offline mode ON', 3000)
        } else {
            toast?.show('Simulating offline mode OFF', 3000)
        }
        setOffline(!offline)
    }

    // If we don't have a selected federation, there's nothing to display here
    // Redirect user to splash screen and render nothing.
    if (!activeFederation) {
        console.log({ activeFederation })
        navigation.navigate('Splash')
        return <View />
    }

    return (
        <Tab.Navigator
            initialRouteName="Home"
            id={TABS_NAVIGATOR_ID}
            screenOptions={({ route }) => ({
                tabBarButton: props => {
                    switch (route.name) {
                        case 'Home':
                            return <Pressable {...props} />
                        case 'Chat':
                            if (connectionOptions) {
                                return <Pressable {...props} />
                            } else {
                                return (
                                    <Pressable
                                        {...props}
                                        style={[
                                            props.style,
                                            styles(theme, insets).disabledIcon,
                                        ]}
                                        onPress={() => {
                                            toast?.show(
                                                t('errors.chat-unavailable'),
                                                3000,
                                            )
                                        }}
                                    />
                                )
                            }
                        default:
                            return null
                    }
                },
                tabBarIcon: ({ focused }) => {
                    switch (route.name) {
                        case 'Home':
                            return (
                                <SvgImage
                                    name="Home"
                                    containerStyle={
                                        styles(theme, insets)
                                            .tabBarIconContainer
                                    }
                                    color={
                                        focused
                                            ? theme.colors.primary
                                            : theme.colors.primaryLight
                                    }
                                />
                            )
                        case 'Chat':
                            return (
                                <SvgImage
                                    name="Chat"
                                    containerStyle={
                                        styles(theme, insets)
                                            .tabBarIconContainer
                                    }
                                    color={
                                        focused
                                            ? theme.colors.primary
                                            : theme.colors.primaryLight
                                    }
                                />
                            )
                        default:
                            return null
                    }
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.primaryLight,
                tabBarStyle: styles(theme, insets).tabBar,
                tabBarItemStyle: styles(theme, insets).tabBarItem,
                headerTitleStyle: theme.components.Text.style,
                tabBarLabelStyle: styles(theme, insets).tabBarLabel,
            })}>
            <Tab.Screen
                name="Home"
                initialParams={{ offline }}
                options={() => ({
                    title: t('words.home'),
                    header: () => (
                        <>
                            <SelectedFederationHeader />
                            <HomeHeader
                                toggleOffline={toggleOffline}
                                offline={offline}
                            />
                        </>
                    ),
                })}>
                {props => <Home {...props} offline={offline} />}
            </Tab.Screen>
            <Tab.Screen
                name="Chat"
                component={ChatScreen}
                options={() => ({
                    header: () => (
                        <>
                            <SelectedFederationHeader />
                            <ChatHeader />
                        </>
                    ),
                })}
            />
        </Tab.Navigator>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        tabBar: {
            backgroundColor: theme.colors.secondary,
            height: theme.sizes.tabBarHeight + insets.bottom,
            borderTopWidth: 1,
            borderTopColor: theme.colors.extraLightGrey,
        },
        tabBarLabel: {
            fontFamily: 'AlbertSans-Bold',
            fontSize: 14,
        },
        tabBarIconContainer: {
            paddingBottom: theme.spacing.xs,
            marginTop: 'auto',
        },
        tabBarItem: {
            paddingBottom: theme.spacing.lg,
        },
        disabledIcon: {
            opacity: 0.2,
            backgroundColor: theme.colors.grey,
        },
        row: {
            flexDirection: 'row',
        },
    })

export default TabsNavigator
