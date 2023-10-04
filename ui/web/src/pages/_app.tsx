import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { Provider as ReduxProvider } from 'react-redux'

import { FediBridgeInitializer } from '../components/FediBridgeInitializer'
import { PWAMetaTags } from '../components/PWAMetaTags'
import { Template } from '../components/Template'
import { ToastManager } from '../components/ToastManager'
import { RouteStateProvider } from '../context/RouteStateContext'
import { fedimint } from '../lib/bridge'
import { store, initializeWebStore } from '../state/store'
import { globalStyles } from '../styles'

const MyApp: React.FC<AppProps> = ({ Component, pageProps }) => {
    globalStyles()

    // Initialize redux store behavior
    useEffect(() => {
        const unsubscribe = initializeWebStore()
        return unsubscribe
    }, [])

    // Initialize bridge logger
    useEffect(() => {
        console.info('setting up logging')
        const unsubscribe = fedimint.addListener('log', event => {
            console.info('log', event)
        })
        return () => unsubscribe()
    }, [])

    return (
        <>
            <PWAMetaTags />
            <ReduxProvider store={store}>
                <RouteStateProvider>
                    <FediBridgeInitializer>
                        <Template>
                            <Component {...pageProps} />
                        </Template>
                        <ToastManager />
                    </FediBridgeInitializer>
                </RouteStateProvider>
            </ReduxProvider>
        </>
    )
}

export default MyApp
