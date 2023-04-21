import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { Provider as ReduxProvider } from 'react-redux'

import { FediBridgeInitializer } from '../components/FediBridgeInitializer'
import { PWAMetaTags } from '../components/PWAMetaTags'
import { Template } from '../components/Template'
import { ToastManager } from '../components/ToastManager'
import { detectLanguage } from '../localization/i18n'
import { store, initializeWebStore } from '../state/store'
import { globalStyles } from '../styles'

const MyApp: React.FC<AppProps> = ({ Component, pageProps }) => {
    globalStyles()

    useEffect(() => {
        // Detect language after initial render to avoid SSR mismatch
        detectLanguage()
        // Initialize redux store behavior
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
