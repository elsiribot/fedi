import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import RNFS from 'react-native-fs'

import { NativeModules } from 'react-native'
import Home from './screens/Home'
import Receive from './screens/Receive'
import Send from './screens/Send'
import Splash from './screens/Splash'

const {
    FedimintFfi: { init, balance, generateInvoice, payInvoice },
} = NativeModules

export type RootStackParamList = {
    Home: undefined
    Send: undefined
    Splash: undefined
    Receive: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

const App = () => {
    const { t } = useTranslation()

    async function initialize() {
        await init(RNFS.DocumentDirectoryPath)
        // console.log('initialized')

        // console.log('initial balance', await balance())

        // console.log(generateInvoice, payInvoice)
        // const invoice = await generateInvoice('21', 'foobar')
        // console.log('invoice', invoice)

        // try {
        //     // await payInvoice(invoice)
        //     console.log('paid invoice')
        // } catch (e) {
        //     console.log('failed to pay invoice', e)
        // }

        // console.log('end balance', await balance())
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
            </Stack.Navigator>
        </NavigationContainer>
    )
}

export default App
