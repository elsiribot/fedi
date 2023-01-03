import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Image, Theme, useTheme } from '@rneui/themed'
import { t } from 'i18next'
import React, { useState } from 'react'
import { StyleSheet } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import { Images } from '../assets/images'
import CommunityHeader from '../components/feature/community/CommunityHeader'
import WalletHeader from '../components/feature/wallet/WalletHeader'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import type { HomeTabsParamList, RootStackParamList } from '../types/navigation'
import Admin from './Admin'
import Community from './Community'
import Sites from './Sites'
import Wallet from './Wallet'

export type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

const Tab = createBottomTabNavigator<HomeTabsParamList>()

const Home: React.FC<Props> = () => {
    const { theme } = useTheme()
    const insets = useSafeAreaInsets()
    const [offline, setOffline] = useState(false)
    const { toast } = useEnvironmentContext().state

    const toggleOffline = () => {
        if (!offline) {
            toast?.show('Simulating offline mode ON', 3000)
        } else {
            toast?.show('Simulating offline mode OFF', 3000)
        }
        setOffline(!offline)
    }

    return (
        <Tab.Navigator
            initialRouteName="Community"
            screenOptions={({ route }) => ({
                tabBarIcon: () => {
                    switch (route.name) {
                        case 'Wallet':
                            return (
                                <Image
                                    style={styles(theme, insets).iconImage}
                                    source={Images.Wallet}
                                />
                            )
                        case 'Community':
                            return (
                                <Image
                                    style={styles(theme, insets).iconImage}
                                    source={Images.FediLogoIcon}
                                />
                            )
                        case 'Sites':
                            return (
                                <Image
                                    style={styles(theme, insets).iconImage}
                                    source={Images.Globe}
                                />
                            )
                        case 'Admin':
                            return (
                                <Image
                                    style={styles(theme, insets).iconImage}
                                    source={Images.Cog}
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
                        <WalletHeader
                            toggleOffline={toggleOffline}
                            offline={offline}
                        />
                    ),
                })}>
                {props => <Wallet {...props} offline={offline} />}
            </Tab.Screen>
            <Tab.Screen
                name="Sites"
                component={Sites}
                options={{
                    title: t('words.sites'),
                    headerShown: false,
                }}
            />
            <Tab.Screen
                name="Community"
                component={Community}
                options={() => ({
                    header: () => <CommunityHeader />,
                })}
            />
            <Tab.Screen
                name="Admin"
                component={Admin}
                options={{
                    title: t('words.admin'),
                    headerShown: false,
                }}
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
