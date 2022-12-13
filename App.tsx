import { ThemeProvider } from '@rneui/themed'
import React, { useEffect } from 'react'
import { Platform } from 'react-native'
import RNFS from 'react-native-fs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { init, LogEvent, TFedimintEventEmitter } from './bridge'

import { FederationsProvider } from './contexts/FederationsContext'
import { BackupRecoveryProvider } from './contexts/BackupRecoveryContext'
import ProviderComposer from './contexts/ProviderComposer'

import Router from './Router'

import theme from './styles/theme'

const App = () => {
    // const [federationIsReady, setFederationIsReady] = useState<boolean>(false)
    // const scheme = useColorScheme()

    // Initializes the connection to the federation
    async function initialize() {
        console.log('initializing connection to federation')
        const start = Date.now()
        await init(RNFS.DocumentDirectoryPath)
        const stop = Date.now()
        console.log('initialized:', stop - start, 'ms OS:', Platform.OS)
    }

    const logHandler = (event: LogEvent) => {
        console.log('OS:', Platform.OS, `": log" -> "${event.log}"`)
    }

    useEffect(() => {
        const emitter = new TFedimintEventEmitter()
        emitter.onLog(logHandler)
        initialize()
    }, [])

    return (
        <SafeAreaProvider>
            <ThemeProvider theme={theme}>
                <ProviderComposer
                    providers={[FederationsProvider, BackupRecoveryProvider]}>
                    <Router />
                </ProviderComposer>
            </ThemeProvider>
        </SafeAreaProvider>
    )
}

export default App
