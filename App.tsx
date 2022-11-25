import { ThemeProvider } from '@rneui/themed'
import React, { useEffect } from 'react'
import { NativeModules } from 'react-native'
import RNFS from 'react-native-fs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
    BalanceEvent,
    LogEvent,
    ReceivedBitcoinEvent,
    ReceivedLightningEvent,
    TFedimintEventEmitter,
} from './emitter'

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

    const logHandler = (event: LogEvent) => {
        console.log(`"log" -> "${event.log}"`)
    }
    const balanceHandler = (event: BalanceEvent) => {
        console.log(`"balance" -> "${event.balance}"`)
    }
    const receivedLightningHandler = (event: ReceivedLightningEvent) => {
        console.log(`"receivedLightning" -> "${event.paymentHash}"`)
    }
    const receivedBitcoinHandler = (event: ReceivedBitcoinEvent) => {
        console.log(`"receivedBitcoin" -> "${event.txid}"`)
    }

    useEffect(() => {
        const emitter = new TFedimintEventEmitter()
        emitter.onBalanceUpdate(balanceHandler)
        emitter.onLog(logHandler)
        emitter.onReceivedLightning(receivedLightningHandler)
        emitter.onReceivedBitcoin(receivedBitcoinHandler)
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
