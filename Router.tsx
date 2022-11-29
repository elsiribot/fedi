import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import { TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Icon, Text, useTheme } from '@rneui/themed'

import Backup from './screens/Backup'
import ConfirmSendLightning from './screens/ConfirmSendLightning'
import ConfirmSendOnChain from './screens/ConfirmSendOnChain'
import Home from './screens/Home'
import LnInvoice from './screens/LnInvoice'
import LnReceiveSuccess from './screens/LnReceiveSuccess'
import OnChainReceiveSuccess from './screens/OnChainReceiveSuccess'
import Receive from './screens/Receive'
import Send from './screens/Send'
import Splash from './screens/Splash'
import Transactions from './screens/Transactions'

import Header from './components/ui/Header'

export type RootStackParamList = {
    Backup: undefined
    ConfirmSendLightning: { invoice: string }
    ConfirmSendOnChain: { address: string }
    Home: undefined
    LnInvoice: { invoice: string }
    LnReceiveSuccess: { amountReceived: string }
    OnChainReceiveSuccess: { amountReceived: string }
    Receive: undefined
    Send: undefined
    Splash: undefined
    Transactions: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

const Router = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()

    return (
        <NavigationContainer theme={theme}>
            <Stack.Navigator
                screenOptions={{
                    headerTitle: props => <Text {...props} />,
                }}>
                <Stack.Group>
                    <Stack.Screen
                        name="Splash"
                        component={Splash}
                        options={{ title: `${t('words.fedimint')}` }}
                    />
                    <Stack.Screen
                        name="Backup"
                        component={Backup}
                        options={{ title: `${t('words.backup')}` }}
                    />
                    <Stack.Screen
                        name="ConfirmSendLightning"
                        component={ConfirmSendLightning}
                        options={{
                            title: `${t('feature.send.confirm-send')}`,
                        }}
                    />
                    <Stack.Screen
                        name="ConfirmSendOnChain"
                        component={ConfirmSendOnChain}
                        options={{
                            title: `${t('feature.send.confirm-send')}`,
                        }}
                    />
                    <Stack.Screen
                        name="Home"
                        component={Home}
                        options={{
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="LnInvoice"
                        component={LnInvoice}
                        options={{
                            title: `${t('phrases.receive-bitcoin')}`,
                        }}
                    />
                    <Stack.Screen
                        name="LnReceiveSuccess"
                        component={LnReceiveSuccess}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="OnChainReceiveSuccess"
                        component={OnChainReceiveSuccess}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="Receive"
                        component={Receive}
                        options={({ navigation }) => ({
                            header: () => (
                                <Header
                                    headerCenter={
                                        <Text h4>
                                            {t('phrases.receive-bitcoin')}
                                        </Text>
                                    }
                                    headerRight={
                                        <TouchableOpacity
                                            onPress={() => navigation.goBack()}>
                                            <Icon name={'close'} />
                                        </TouchableOpacity>
                                    }
                                />
                            ),
                        })}
                    />
                    <Stack.Screen
                        name="Send"
                        component={Send}
                        options={{ title: `${t('words.send')}` }}
                    />
                </Stack.Group>
                <Stack.Group screenOptions={{ presentation: 'modal' }}>
                    <Stack.Screen
                        name="Transactions"
                        component={Transactions}
                        options={({ navigation }) => ({
                            header: () => (
                                <Header
                                    headerCenter={
                                        <Text h4>
                                            {t('words.transactions')}
                                        </Text>
                                    }
                                    headerRight={
                                        <TouchableOpacity
                                            onPress={() => navigation.goBack()}>
                                            <Icon name={'close'} />
                                        </TouchableOpacity>
                                    }
                                />
                            ),
                        })}
                    />
                </Stack.Group>
            </Stack.Navigator>
        </NavigationContainer>
    )
}

export default Router
