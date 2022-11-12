import React from 'react'
import { StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import HomeScreen from './screens/HomeScreen'
import PayScreen from './screens/PayScreen'

export type RootStackParamList = {
    Home: undefined
    Pay: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

const App = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{ title: 'Welcome' }}
                />
                <Stack.Screen
                    name="Pay"
                    component={PayScreen}
                    options={{ title: 'Pay' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    )
}

const styles = StyleSheet.create({})

export default App
