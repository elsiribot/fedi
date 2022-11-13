import React from 'react'
import { Text } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'

import Splash from './screens/Splash'
import Home from './screens/Home'
import Send from './screens/Send'
import Receive from './screens/Receive'
import LnInvoice from './screens/LnInvoice'

export type RootStackParamList = {
    Home: undefined
    Send: undefined
    Splash: undefined
    Receive: undefined
    LnInvoice: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

const App = () => {
    const { t } = useTranslation()

    return (
        <NavigationContainer>
            <Text>{t('words.fedimint')}</Text>
            <Stack.Navigator>
                <Stack.Screen
                    name="Splash"
                    component={Splash}
                    options={{ title: 'Splash' }}
                />
                <Stack.Screen
                    name="Home"
                    component={Home}
                    options={{ title: 'Home' }}
                />
                <Stack.Screen
                    name="Send"
                    component={Send}
                    options={{ title: 'Send' }}
                />
                <Stack.Screen
                    name="Receive"
                    component={Receive}
                    options={{ title: 'Receive' }}
                />
                <Stack.Screen
                    name="LnInvoice"
                    component={LnInvoice}
                    options={{ title: 'Receive Bitcoin' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    )
}

export default App
