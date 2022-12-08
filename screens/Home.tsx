import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import FaIcon from 'react-native-vector-icons/FontAwesome'
import Fa5Icon from 'react-native-vector-icons/FontAwesome5'
import { Icon, Text, Theme, useTheme } from '@rneui/themed'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StyleSheet, TouchableOpacity } from 'react-native'

import type { RootStackParamList } from '../Router'
import Settings from './Settings'
import Wallet from './Wallet'
import Header from '../components/ui/Header'
import SelectedFederationHeader from '../components/feature/federations/SelectedFederationHeader'

export type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

export type HomeTabsParamList = {
    Settings: undefined
    Wallet: undefined
}

const Tab = createBottomTabNavigator<HomeTabsParamList>()

const Home: React.FC<Props> = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const insets = useSafeAreaInsets()

    return (
        <Tab.Navigator
            initialRouteName="Settings"
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
                tabBarStyle: styles(theme, insets).tabBar,
                headerTitleStyle: theme.components.Text.style,
            })}>
            <Tab.Screen
                name="Wallet"
                component={Wallet}
                options={({ navigation }) => ({
                    header: () => (
                        <Header
                            headerLeft={<Text h3>{t('words.wallet')}</Text>}
                            headerRight={
                                <TouchableOpacity
                                    onPress={() =>
                                        navigation.navigate('Transactions')
                                    }>
                                    <Icon name={'format-list-bulleted'} />
                                </TouchableOpacity>
                            }
                        />
                    ),
                })}
            />
            <Tab.Screen
                name="Settings"
                component={Settings}
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
    })

export default Home
