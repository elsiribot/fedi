import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import { t } from 'i18next'
import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChatSvg, CogSvg, GlobeSvg, WalletSvg } from '../assets/images/svgs'

import CommunityHeader from '../components/feature/community/CommunityHeader'
import SelectedFederationHeader from '../components/feature/federations/SelectedFederationHeader'
import WalletHeader from '../components/feature/wallet/WalletHeader'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useFederationsContext } from '../state/contexts/FederationsContext'
import {
    HomeTabsParamList,
    HOME_NAVIGATOR_ID,
    RootStackParamList,
} from '../types/navigation'
import Admin from './Admin'
import Community from './Community'
import Sites from './Sites'
import Wallet from './Wallet'

export type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

const Tab = createBottomTabNavigator<HomeTabsParamList>()

const Home: React.FC<Props> = ({ navigation }: Props) => {
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
            initialRouteName="Wallet"
            id={HOME_NAVIGATOR_ID}
            screenOptions={({ route }) => ({
                tabBarIcon: () => {
                    switch (route.name) {
                        case 'Wallet':
                            return (
                                <WalletSvg
                                    height={theme.sizes.sm}
                                    width={theme.sizes.sm}
                                />
                            )
                        case 'Chat':
                            return (
                                <ChatSvg
                                    height={theme.sizes.sm}
                                    width={theme.sizes.sm}
                                />
                            )
                        case 'Sites':
                            return (
                                <GlobeSvg
                                    height={theme.sizes.sm}
                                    width={theme.sizes.sm}
                                />
                            )
                        case 'Admin':
                            return (
                                <CogSvg
                                    height={theme.sizes.sm}
                                    width={theme.sizes.sm}
                                />
                            )
                        default:
                            return null
                    }
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.primaryLight,
                tabBarStyle: styles(theme, insets).tabBar,
                headerTitleStyle: theme.components.Text.style,
            })}>
            <Tab.Screen
                name="Wallet"
                initialParams={{ offline }}
                options={() => ({
                    title: t('words.wallet'),
                    header: () => (
                        <>
                            <SelectedFederationHeader />
                            <WalletHeader
                                toggleOffline={toggleOffline}
                                offline={offline}
                            />
                        </>
                    ),
                })}>
                {props => <Wallet {...props} offline={offline} />}
            </Tab.Screen>
            <Tab.Screen
                name="Chat"
                component={Community}
                options={() => ({
                    header: () => (
                        <>
                            <SelectedFederationHeader />
                            <CommunityHeader />
                        </>
                    ),
                })}
            />
            <Tab.Screen
                name="Sites"
                component={Sites}
                options={() => ({
                    title: t('words.sites'),
                    headerShown: false,
                })}
            />
            <Tab.Screen
                name="Admin"
                component={Admin}
                options={() => ({
                    title: t('words.admin'),
                    header: () => (
                        <>
                            <SelectedFederationHeader />
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
            paddingBottom: 10 + insets.bottom,
            height: 63 + insets.bottom,
        },
        image: {
            height: 32,
            width: 120,
            color: theme.colors.grey,
            resizeMode: 'contain',
        },
        iconImage: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        row: {
            flexDirection: 'row',
        },
    })

export default Home
