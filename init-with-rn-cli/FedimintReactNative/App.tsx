import React, { useEffect } from 'react'
import {
    NavigationContainer,
    DarkTheme,
    DefaultTheme,
} from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import RNFS from 'react-native-fs'
import { NativeModules, useColorScheme } from 'react-native'

import ConfirmSend from './screens/ConfirmSend'
import Home from './screens/Home'
import LnInvoice from './screens/LnInvoice'
import Receive from './screens/Receive'
import Send from './screens/Send'
import Splash from './screens/Splash'

const {
    FedimintFfi: { init },
} = NativeModules

export type RootStackParamList = {
    Home: undefined
    Send: undefined
    Splash: undefined
    Receive: undefined
    LnInvoice: { invoice: string }
    ConfirmSend: { invoice: string }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

const App = () => {
    const { t } = useTranslation()
    const scheme = useColorScheme()

    // Initializes the connection to the federation
    async function initialize() {
        await init(RNFS.DocumentDirectoryPath)
    }

    useEffect(() => {
        initialize()
    }, [])

    console.log('scheme')
    console.log(scheme)

    return (
        <NavigationContainer
            theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack.Navigator>
                <Stack.Screen
                    name="Splash"
                    component={Splash}
                    options={{ title: `${t('words.fedimint')}` }}
                />
                <Stack.Screen
                    name="Home"
                    component={Home}
                    options={{ title: `${t('words.home')}` }}
                />
                <Stack.Screen
                    name="Send"
                    component={Send}
                    options={{ title: `${t('words.send')}` }}
                />
                <Stack.Screen
                    name="ConfirmSend"
                    component={ConfirmSend}
                    options={{ title: `${t('feature.send.confirm-send')}` }}
                />
                <Stack.Screen
                    name="Receive"
                    component={Receive}
                    options={{ title: `${t('phrases.receive-bitcoin')}` }}
                />
                <Stack.Screen
                    name="LnInvoice"
                    component={LnInvoice}
                    options={{ title: `${t('phrases.receive-bitcoin')}` }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    )
}

export default App
