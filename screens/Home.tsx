import React from 'react'
import { useTranslation } from 'react-i18next'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import FaIcon from 'react-native-vector-icons/FontAwesome'
import Fa5Icon from 'react-native-vector-icons/FontAwesome5'
import { Theme, useTheme } from '@rneui/themed'
import { StyleSheet } from 'react-native'

import type { RootStackParamList } from '../Router'
import Settings from './Settings'
import Wallet from './Wallet'

export type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

export type HomeTabsParamList = {
    Settings: undefined
    Wallet: undefined
}

const Tab = createBottomTabNavigator<HomeTabsParamList>()

const Home: React.FC<Props> = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()

    return (
        <Tab.Navigator
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
                        case 'Settings':
                            return (
                                <FaIcon
                                    name={'gear'}
                                    size={size}
                                    color={color}
                                />
                            )
                        default:
                            return null
                    }
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.primaryLight,
                tabBarStyle: styles(theme).tabBar,
                headerTitleStyle: theme.components.Text.style,
            })}>
            <Tab.Screen
                name="Wallet"
                component={Wallet}
                options={{ title: `${t('words.wallet')}` }}
            />
            <Tab.Screen
                name="Settings"
                component={Settings}
                options={{ title: `${t('words.settings')}` }}
            />
        </Tab.Navigator>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        tabBar: {
            backgroundColor: theme.colors.secondary,
            paddingBottom: 10,
            height: 63,
        },
    })

export default Home
