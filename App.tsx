import React, { useEffect } from 'react'
import { NativeModules } from 'react-native'
import RNFS from 'react-native-fs'
import { ThemeProvider } from '@rneui/themed'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import Router from './Router'

import theme from './styles/theme'

const {
    FedimintFfi: { init },
} = NativeModules

const App = () => {
    // const scheme = useColorScheme()

    // Initializes the connection to the federation
    async function initialize() {
        await init(RNFS.DocumentDirectoryPath)
    }

    useEffect(() => {
        initialize()
    }, [])

    return (
        <SafeAreaProvider>
            <ThemeProvider theme={theme}>
                <Router />
            </ThemeProvider>
        </SafeAreaProvider>
    )
}

export default App
