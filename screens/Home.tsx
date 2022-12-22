import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useState } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import FaIcon from 'react-native-vector-icons/FontAwesome'
import Fa5Icon from 'react-native-vector-icons/FontAwesome5'
import { Image, Theme, useTheme } from '@rneui/themed'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StyleSheet } from 'react-native'

import type { HomeTabsParamList, RootStackParamList } from '../types/navigation'
import Admin from './Admin'
import Sites from './Sites'
import Wallet from './Wallet'
import WalletHeader from '../components/feature/wallet/WalletHeader'
import { Images } from '../assets/images'
import { useEnvironmentContext } from '../contexts/EnvironmentContext'

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
            initialRouteName="Wallet"
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    switch (route.name) {
                        case 'Wallet':
                            return (
                                <Fa5Icon
                                    name={'wallet'}
                                    size={size}
                                    color={color}
                                />
                            )
                        case 'Admin':
                            return (
                                <FaIcon
                                    name={'gear'}
                                    size={size}
                                    color={color}
                                />
                            )
                        case 'Sites':
                            return (
                                <Image
                                    style={styles(theme, insets).iconImage}
                                    source={Images.Globe}
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
                    headerShown: false,
                }}
            />
            <Tab.Screen
                name="Admin"
                component={Admin}
                options={{
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
