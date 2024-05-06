import messaging from '@react-native-firebase/messaging'
import { ThemeProvider } from '@rneui/themed'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Provider as ReduxProvider } from 'react-redux'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'

import Router from './Router'
import FediBridgeInitializer from './components/FediBridgeInitializer'
import ToastManager from './components/ui/ToastManager'
import { ErrorScreen } from './screens/ErrorScreen'
import { BackupRecoveryProvider } from './state/contexts/BackupRecoveryContext'
import { OmniLinkContextProvider } from './state/contexts/OmniLinkContext'
import ProviderComposer from './state/contexts/ProviderComposer'
import { initializeNativeStore, store } from './state/store'
import theme from './styles/theme'
import { handleForegroundReceived } from './utils/notifications'

const App = () => {
    // Initialize redux store
    useEffect(() => {
        const unsubscribe = initializeNativeStore()
        return unsubscribe
    }, [])

    useEffect(() => {
        // Handles notifications when app is open
        const unsubscribe = messaging().onMessage(handleForegroundReceived)
        return unsubscribe
    }, [])

    return (
        <SafeAreaProvider>
            <ThemeProvider theme={theme}>
                <ErrorBoundary fallback={props => <ErrorScreen {...props} />}>
                    <ReduxProvider store={store}>
                        <FediBridgeInitializer>
                            <ProviderComposer
                                providers={[
                                    BackupRecoveryProvider,
                                    OmniLinkContextProvider,
                                ]}>
                                {<Router />}
                                <ToastManager />
                            </ProviderComposer>
                        </FediBridgeInitializer>
                    </ReduxProvider>
                </ErrorBoundary>
            </ThemeProvider>
        </SafeAreaProvider>
    )
}

export default App
