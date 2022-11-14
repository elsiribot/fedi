import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import RNFS from 'react-native-fs'
import { NativeModules } from 'react-native'

import Home from './screens/Home'
import Receive from './screens/Receive'
import LnInvoice from './screens/LnInvoice'
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
}

const Stack = createNativeStackNavigator<RootStackParamList>()

const App = () => {
    const { t } = useTranslation()

    // Initializes the connection to the federation
    async function initialize() {
        await init(RNFS.DocumentDirectoryPath)
    }

    useEffect(() => {
        initialize()
    }, [])

    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen
                    name="Splash"
                    component={Splash}
                    options={{ title: t('words.fedimint') }}
                />
                <Stack.Screen
                    name="Home"
                    component={Home}
                    options={{ title: t('words.home') }}
                />
                <Stack.Screen
                    name="Send"
                    component={Send}
                    options={{ title: t('words.send') }}
                />
                <Stack.Screen
                    name="Receive"
                    component={Receive}
                    options={{ title: t('phrases.receive-bitcoin') }}
                />
                <Stack.Screen
                    name="LnInvoice"
                    component={LnInvoice}
                    options={{ title: t('phrases.receive-bitcoin') }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    )
}

export default App
