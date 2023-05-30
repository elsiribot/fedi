import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { Provider as ReduxProvider } from 'react-redux'

import { FediBridgeInitializer } from '../components/FediBridgeInitializer'
import { PWAMetaTags } from '../components/PWAMetaTags'
import { Template } from '../components/Template'
import { ToastManager } from '../components/ToastManager'
import { store, initializeWebStore } from '../state/store'
import { globalStyles } from '../styles'

const MyApp: React.FC<AppProps> = ({ Component, pageProps }) => {
    globalStyles()

    // Initialize redux store behavior
    useEffect(() => {
        initializeWebStore()
    }, [])

    return (
        <>
            <PWAMetaTags />
            <ReduxProvider store={store}>
                <FediBridgeInitializer>
                    <Template>
                        <Component {...pageProps} />
                    </Template>
                    <ToastManager />
                </FediBridgeInitializer>
            </ReduxProvider>
        </>
    )
}

export default MyApp
