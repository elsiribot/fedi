import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import { t } from 'i18next'
import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'
import SvgImage from '../components/ui/SvgImage'

import ChatHeader from '../components/feature/chat/ChatHeader'
import SelectedFederationHeader from '../components/feature/federations/SelectedFederationHeader'
import HomeHeader from '../components/feature/home/HomeHeader'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useFederationsContext } from '../state/contexts/FederationsContext'
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
    const { theme } = useTheme()
    const insets = useSafeAreaInsets()
    const [offline, setOffline] = useState(false)
    const { toast } = useEnvironmentContext().state
    const { selectedFederation } = useFederationsContext().state

    const toggleOffline = () => {
        if (!offline) {
            toast?.show('Simulating offline mode ON', 3000)
        } else {
            toast?.show('Simulating offline mode OFF', 3000)
        }
        setOffline(!offline)
    }

    // Make sure all users have a username and push them to the
    // FederationWelcome screen if they don't have one
    useEffect(() => {
        if (!selectedFederation?.username) {
            navigation.replace('FederationWelcome')
        }
    }, [navigation, selectedFederation?.username])

    // If we don't have a selected federation, there's nothing to display here
    // Redirect user to splash screen and render nothing.
    if (!selectedFederation) {
        navigation.navigate('Splash')
        return <View />
    }

    return (
        <Tab.Navigator
            initialRouteName="Home"
            id={TABS_NAVIGATOR_ID}
            screenOptions={({ route }) => ({
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
                                    svgProps={{
                                        stroke: focused
                                            ? theme.colors.primary
                                            : theme.colors.primaryLight,
                                    }}
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
                                    svgProps={{
                                        stroke: focused
                                            ? theme.colors.primary
                                            : theme.colors.primaryLight,
                                    }}
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
            // hides the default top border on nav
            borderColor: 'transparent',
            elevation: 0,
        },
        tabBarLabel: {
            fontFamily: 'AlbertSans-Bold',
        },
        tabBarIconContainer: {
            paddingBottom: theme.spacing.xs,
            marginTop: 'auto',
        },
        tabBarItem: {
            paddingBottom: theme.spacing.lg,
        },
        row: {
            flexDirection: 'row',
        },
    })

export default TabsNavigator
