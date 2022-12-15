import { NavigationContainer } from '@react-navigation/native'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import ChooseBackupMethod from './screens/ChooseBackupMethod'
import ConfirmReceiveOffline from './screens/ConfirmReceiveOffline'
import ConfirmSendLightning from './screens/ConfirmSendLightning'
import ConfirmSendOnChain from './screens/ConfirmSendOnChain'
import FederationInvite from './screens/FederationInvite'
import Home from './screens/Home'
import LnInvoice from './screens/LnInvoice'
import PersonalBackupSuccess from './screens/PersonalBackupSuccess'
import Receive from './screens/Receive'
import ReceiveOffline from './screens/ReceiveOffline'
import ReceiveSuccess from './screens/ReceiveSuccess'
import RecordBackupVideo from './screens/RecordBackupVideo'
import RecoveryWords from './screens/RecoveryWords'
import RequestCameraAccess from './screens/RequestCameraAccess'
import ScanFederationCode from './screens/ScanFederationCode'
import Send from './screens/Send'
import SendOfflineAmount from './screens/SendOfflineAmount'
import SendOfflineQr from './screens/SendOfflineQr'
import Splash from './screens/Splash'
import StartPersonalBackup from './screens/StartPersonalBackup'
import StartSocialBackup from './screens/StartSocialBackup'
import Transactions from './screens/Transactions'

import ChooseBackupMethodHeader from './components/feature/backup/ChooseBackupMethodHeader'
import ConnectedFederationsDrawer from './components/feature/federations/ConnectedFederationsDrawer'
import FederationInviteHeader from './components/feature/federations/FederationInviteHeader'
import LnInvoiceHeader from './components/feature/receive/LnInvoiceHeader'
import PersonalBackupHeader from './components/feature/backup/PersonalBackupHeader'
import ReceiveBitcoinHeader from './components/feature/receive/ReceiveBitcoinHeader'
import RecoveryWordsHeader from './components/feature/backup/RecoveryWordsHeader'
import ScanFederationCodeHeader from './components/feature/federations/ScanFederationCodeHeader'
import SelectedFederationHeader from './components/feature/federations/SelectedFederationHeader'
import SendBitcoinHeader from './components/feature/send/SendBitcoinHeader'
import SendHeader from './components/feature/send/SendHeader'
import SocialBackupHeader from './components/feature/backup/SocialBackupHeader'
import TransactionsHeader from './components/feature/transaction-history/TransactionsHeader'

import { useFederationsContext } from './contexts/FederationsContext'
import SocialBackupProcessing from './screens/SocialBackupProcessing'
import CompleteSocialBackup from './screens/CompleteSocialBackup'
import SocialBackupCloudUpload from './screens/SocialBackupCloudUpload'
import SocialBackupSuccess from './screens/SocialBackupSuccess'

import { TemporaryTransaction } from './bridge'

export type RootStackParamList = {
    ChooseBackupMethod: undefined
    CompleteSocialBackup: undefined
    ConfirmSendLightning: { invoice: string }
    ConfirmSendOnChain: { address: string }
    ConfirmReceiveOffline: { ecash: string; amount: number }
    ConnectedFederationsDrawer: undefined
    FederationInvite: { inviteLink: string }
    Home: undefined
    LnInvoice: { invoice: string }
    PersonalBackupSuccess: undefined
    ReceiveSuccess: { tx: TemporaryTransaction }
    Receive: undefined
    ReceiveOffline: undefined
    RecoveryWords: undefined
    RecordBackupVideo: undefined
    RequestCameraAccess: { nextScreen: keyof RootStackParamList }
    ScanFederationCode: undefined
    Send: undefined
    SendOfflineAmount: undefined
    SendOfflineQr: { ecash: string; amount: number }
    Splash: undefined
    StartPersonalBackup: undefined
    StartSocialBackup: undefined
    SocialBackupProcessing: undefined
    SocialBackupCloudUpload: undefined
    SocialBackupSuccess: undefined
    Transactions: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()
const Drawer = createDrawerNavigator()

const MainNavigator = () => {
    const { t } = useTranslation()
    const {
        state: { selectedFederation },
    } = useFederationsContext()

    return (
        <Stack.Navigator initialRouteName="Splash" id="MainStackNavigator">
            <>
                {selectedFederation !== null ? (
                    // This group of screens relies on a non-null selectedFederation
                    // in the FederationsContext because they contain API calls to the
                    // FFI NativeModule. Since it is possible to store multiple federation
                    // connections in-app, each call requires a Federation to be specified
                    <Stack.Group>
                        <Stack.Group>
                            <Stack.Screen
                                name="Home"
                                component={Home}
                                options={({ navigation }) => ({
                                    header: () => (
                                        <SelectedFederationHeader
                                            navigation={navigation}
                                        />
                                    ),
                                })}
                            />
                            <Stack.Screen
                                name="ChooseBackupMethod"
                                component={ChooseBackupMethod}
                                options={() => ({
                                    header: () => <ChooseBackupMethodHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="ConfirmSendLightning"
                                component={ConfirmSendLightning}
                                options={() => ({
                                    header: () => <SendBitcoinHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="FederationInvite"
                                component={FederationInvite}
                                options={() => ({
                                    header: () => <FederationInviteHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="ConfirmSendOnChain"
                                component={ConfirmSendOnChain}
                                options={() => ({
                                    header: () => <SendBitcoinHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="ConfirmReceiveOffline"
                                component={ConfirmReceiveOffline}
                                options={() => ({
                                    // header: () => <SendBitcoinHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="LnInvoice"
                                component={LnInvoice}
                                options={() => ({
                                    header: () => <LnInvoiceHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="SendOfflineAmount"
                                component={SendOfflineAmount}
                                options={() => ({
                                    // header: () => <LnInvoiceHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="SendOfflineQr"
                                component={SendOfflineQr}
                                options={() => ({
                                    // header: () => <LnInvoiceHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="Receive"
                                component={Receive}
                                options={() => ({
                                    header: () => <ReceiveBitcoinHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="ReceiveOffline"
                                component={ReceiveOffline}
                                options={() => ({
                                    // header: () => <ReceiveBitcoinHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="ReceiveSuccess"
                                component={ReceiveSuccess}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="RecordBackupVideo"
                                component={RecordBackupVideo}
                                options={() => ({
                                    header: () => (
                                        <SocialBackupHeader backButton />
                                    ),
                                })}
                            />
                            <Stack.Screen
                                name="StartSocialBackup"
                                component={StartSocialBackup}
                                options={() => ({
                                    header: () => (
                                        <SocialBackupHeader backButton />
                                    ),
                                })}
                            />
                            <Stack.Screen
                                name="SocialBackupProcessing"
                                component={SocialBackupProcessing}
                                options={() => ({
                                    header: () => (
                                        <SocialBackupHeader closeButton />
                                    ),
                                })}
                            />
                            <Stack.Screen
                                name="SocialBackupCloudUpload"
                                component={SocialBackupCloudUpload}
                                options={() => ({
                                    header: () => (
                                        <SocialBackupHeader closeButton />
                                    ),
                                })}
                            />
                            <Stack.Screen
                                name="CompleteSocialBackup"
                                component={CompleteSocialBackup}
                                options={() => ({
                                    header: () => (
                                        <SocialBackupHeader closeButton />
                                    ),
                                })}
                            />
                            <Stack.Screen
                                name="SocialBackupSuccess"
                                component={SocialBackupSuccess}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="StartPersonalBackup"
                                component={StartPersonalBackup}
                                options={() => ({
                                    header: () => <PersonalBackupHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="RecoveryWords"
                                component={RecoveryWords}
                                options={() => ({
                                    header: () => <RecoveryWordsHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="PersonalBackupSuccess"
                                component={PersonalBackupSuccess}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="RequestCameraAccess"
                                component={RequestCameraAccess}
                                options={{ headerShown: false }}
                                initialParams={{
                                    nextScreen: 'ScanFederationCode',
                                }}
                            />
                            <Stack.Screen
                                name="Send"
                                component={Send}
                                options={() => ({
                                    header: () => <SendHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="ScanFederationCode"
                                component={ScanFederationCode}
                                options={() => ({
                                    header: () => <ScanFederationCodeHeader />,
                                })}
                            />
                        </Stack.Group>
                        <Stack.Group screenOptions={{ presentation: 'modal' }}>
                            <Stack.Screen
                                name="Transactions"
                                component={Transactions}
                                options={() => ({
                                    header: () => <TransactionsHeader />,
                                })}
                            />
                        </Stack.Group>
                    </Stack.Group>
                ) : (
                    // This group of screens does not assume any federation connections
                    // have been established and are used primarily for onboarding the
                    // user to connect to at least 1 federation
                    <Stack.Group>
                        <Stack.Screen
                            name="Splash"
                            component={Splash}
                            options={{
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="RequestCameraAccess"
                            component={RequestCameraAccess}
                            options={{ headerShown: false }}
                            initialParams={{
                                nextScreen: 'ScanFederationCode',
                            }}
                        />
                        <Stack.Screen
                            name="ScanFederationCode"
                            component={ScanFederationCode}
                            options={() => ({
                                header: () => <ScanFederationCodeHeader />,
                            })}
                        />
                    </Stack.Group>
                )}
            </>
        </Stack.Navigator>
    )
}

const Router = () => {
    const { theme } = useTheme()

    return (
        <NavigationContainer theme={theme}>
            <Drawer.Navigator
                id="ConnectedFederationsDrawer"
                drawerContent={ConnectedFederationsDrawer}>
                <Drawer.Screen
                    name="MainNavigator"
                    component={MainNavigator}
                    options={{ headerShown: false }}
                />
            </Drawer.Navigator>
        </NavigationContainer>
    )
}

export default Router
