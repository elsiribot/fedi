import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text } from 'react-native'
import RNFS from 'react-native-fs'

import Home from './screens/Home'
import Receive from './screens/Receive'
import Send from './screens/Send'
import Splash from './screens/Splash'

export type RootStackParamList = {
    Home: undefined
    Send: undefined
    Splash: undefined
    Receive: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

const App = () => {
    const { t } = useTranslation()

    const [documentsFolder, setDocumentsFolder] = useState('')
    useEffect(() => {
        setDocumentsFolder(RNFS.DocumentDirectoryPath) //alternative to MainBundleDirectory.
    }, [])

    return (
        <NavigationContainer>
            <Text>{documentsFolder}</Text>
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
