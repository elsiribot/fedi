import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import FaIcon from 'react-native-vector-icons/FontAwesome'
import Fa5Icon from 'react-native-vector-icons/FontAwesome5'
import { Icon, Image, Text, Theme, useTheme } from '@rneui/themed'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import type { RootStackParamList } from '../Router'
import Admin from './Admin'
import Wallet from './Wallet'
import Header from '../components/ui/Header'
import { Images } from '../assets/images'

export type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

export type HomeTabsParamList = {
    Admin: undefined
    Wallet: { offline: boolean }
}

const Tab = createBottomTabNavigator<HomeTabsParamList>()

const Home: React.FC<Props> = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const insets = useSafeAreaInsets()
    const [offline, setOffline] = useState(false)

    const toggleOffline = () => {
        setOffline(!offline)
        console.log('offline', offline)
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
                options={({ navigation }) => ({
                    header: () => (
                        <Header
                            headerLeft={
                                <Text onPress={toggleOffline} h3>
                                    {t('words.wallet')}
                                </Text>
                            }
                            headerRight={
                                <View style={styles(theme, insets).row}>
                                    {offline && (
                                        <Image
                                            source={Images.Offline}
                                            style={styles(theme, insets).image}
                                        />
                                    )}
                                    <TouchableOpacity
                                        onPress={() =>
                                            navigation.navigate('Transactions')
                                        }>
                                        <Icon name={'format-list-bulleted'} />
                                    </TouchableOpacity>
                                </View>
                            }
                        />
                    ),
                })}>
                {props => <Wallet {...props} offline={offline} />}
            </Tab.Screen>
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
        row: {
            flexDirection: 'row',
        },
    })

export default Home
