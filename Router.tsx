import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@rneui/themed'

import Backup from './screens/Backup'
import ConfirmSend from './screens/ConfirmSend'
import ConfirmSendOnChain from './screens/ConfirmSendOnChain'
import Home from './screens/Home'
import LnInvoice from './screens/LnInvoice'
import Receive from './screens/Receive'
import Send from './screens/Send'
import Splash from './screens/Splash'

export type RootStackParamList = {
    Backup: undefined
    ConfirmSend: { invoice: string }
    ConfirmSendOnChain: { address: string }
    Home: undefined
    LnInvoice: { invoice: string }
    Receive: undefined
    Send: undefined
    Splash: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

const Router = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()

    return (
        <NavigationContainer theme={theme}>
            <Stack.Navigator>
                <Stack.Screen
                    name="Backup"
                    component={Backup}
                    options={{ title: `${t('words.backup')}` }}
                />
                <Stack.Screen
                    name="ConfirmSend"
                    component={ConfirmSend}
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
                    options={{ title: `${t('words.home')}` }}
                />
                <Stack.Screen
                    name="LnInvoice"
                    component={LnInvoice}
                    options={{
                        title: `${t('phrases.receive-bitcoin')}`,
                    }}
                />
                <Stack.Screen
                    name="Receive"
                    component={Receive}
                    options={{
                        title: `${t('phrases.receive-bitcoin')}`,
                    }}
                />
                <Stack.Screen
                    name="Send"
                    component={Send}
                    options={{ title: `${t('words.send')}` }}
                />
                <Stack.Screen
                    name="Splash"
                    component={Splash}
                    options={{ title: `${t('words.fedimint')}` }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    )
}

export default Router
