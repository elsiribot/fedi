import { NavigationContainer } from '@react-navigation/native'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTheme } from '@rneui/themed'
import React from 'react'

import ChooseBackupMethod from './screens/ChooseBackupMethod'
import ChooseRecoveryMethod from './screens/ChooseRecoveryMethod'
import CompleteSocialBackup from './screens/CompleteSocialBackup'
import CompleteSocialRecovery from './screens/CompleteSocialRecovery'
import ConfirmReceiveOffline from './screens/ConfirmReceiveOffline'
import ConfirmSendLightning from './screens/ConfirmSendLightning'
import ConfirmSendOnChain from './screens/ConfirmSendOnChain'
import FederationInvite from './screens/FederationInvite'
import Home from './screens/Home'
import PersonalBackupSuccess from './screens/PersonalBackupSuccess'
import LocateSocialRecovery from './screens/LocateSocialRecovery'
import Receive from './screens/Receive'
import ReceiveOffline from './screens/ReceiveOffline'
import ReceiveSuccess from './screens/ReceiveSuccess'
import RecordBackupVideo from './screens/RecordBackupVideo'
import RecoveryAssistConfirmation from './screens/RecoveryAssistConfirmation'
import RecoveryAssistSuccess from './screens/RecoveryAssistSuccess'
import RecoveryWords from './screens/RecoveryWords'
import RequestCameraAccess from './screens/RequestCameraAccess'
import ScanFederationCode from './screens/ScanFederationCode'
import ScanSocialRecoveryCode from './screens/ScanSocialRecoveryCode'
import SelectRecoveryFileSuccess from './screens/SelectRecoveryFileSuccess'
import SelectRecoveryFileFailure from './screens/SelectRecoveryFileFailure'
import Send from './screens/Send'
import SendOfflineAmount from './screens/SendOfflineAmount'
import SendOfflineQr from './screens/SendOfflineQr'
import SocialBackupCloudUpload from './screens/SocialBackupCloudUpload'
import SocialBackupProcessing from './screens/SocialBackupProcessing'
import SocialBackupSuccess from './screens/SocialBackupSuccess'
import SocialRecoveryFailure from './screens/SocialRecoveryFailure'
import SocialRecoveryQrModal from './screens/SocialRecoveryQrModal'
import SocialRecoverySuccess from './screens/SocialRecoverySuccess'
import Splash from './screens/Splash'
import StartPersonalBackup from './screens/StartPersonalBackup'
import StartRecoveryAssist from './screens/StartRecoveryAssist'
import StartSocialBackup from './screens/StartSocialBackup'
import Transactions from './screens/Transactions'

import ChooseBackupMethodHeader from './components/feature/backup/ChooseBackupMethodHeader'
import PersonalBackupHeader from './components/feature/backup/PersonalBackupHeader'
import RecoveryWordsHeader from './components/feature/backup/RecoveryWordsHeader'
import SocialBackupHeader from './components/feature/backup/SocialBackupHeader'
import ScanFederationCodeHeader from './components/feature/federations/ScanFederationCodeHeader'
import SelectedFederationHeader from './components/feature/federations/SelectedFederationHeader'
import ConnectedFederationsDrawer from './components/feature/federations/ConnectedFederationsDrawer'
import FederationInviteHeader from './components/feature/federations/FederationInviteHeader'
import SendBitcoinHeader from './components/feature/send/SendBitcoinHeader'
import SendBitcoinOfflineHeader from './components/feature/send/SendBitcoinOfflineHeader'
import SendHeader from './components/feature/send/SendHeader'
import ReceiveBitcoinHeader from './components/feature/receive/ReceiveBitcoinHeader'
import ReceiveBitcoinOfflineHeader from './components/feature/receive/ReceiveBitcoinOfflineHeader'
import ChooseRecoveryMethodHeader from './components/feature/recovery/ChooseRecoveryMethodHeader'
import SocialRecoveryHeader from './components/feature/recovery/SocialRecoveryHeader'
import RecoveryAssistHeader from './components/feature/recovery/RecoveryAssistHeader'
import TransactionsHeader from './components/feature/transaction-history/TransactionsHeader'

import { useFederationsContext } from './contexts/FederationsContext'

import { MAIN_NAVIGATOR_ID, RootStackParamList } from './types/navigation'
import PersonalRecoverySuccess from './screens/PersonalRecoverySuccess'
import PersonalRecovery from './screens/PersonalRecovery'
import PersonalRecoveryHeader from './components/feature/recovery/PersonalRecoveryHeader'
import SitesBrowser from './screens/SitesBrowser'
import SitesHeader from './components/feature/sites/SitesHeader'
import SendSuccess from './screens/SendSuccess'
import BitcoinRequest from './screens/BitcoinRequest'
import BitcoinRequestHeader from './components/feature/receive/BitcoinRequestHeader'

const Stack = createNativeStackNavigator<RootStackParamList>()
const Drawer = createDrawerNavigator()

const MainNavigator = () => {
    const {
        state: { selectedFederation },
    } = useFederationsContext()

    return (
        <Stack.Navigator initialRouteName="Splash" id={MAIN_NAVIGATOR_ID}>
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
                            {/* Wallet (Send) */}
                            <Stack.Screen
                                name="Send"
                                component={Send}
                                options={() => ({
                                    header: () => <SendHeader />,
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
                                name="ConfirmSendOnChain"
                                component={ConfirmSendOnChain}
                                options={() => ({
                                    header: () => <SendBitcoinHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="SendSuccess"
                                component={SendSuccess}
                                initialParams={{ amount: 0, unit: 'sats' }}
                                options={{ headerShown: false }}
                            />
                            {/* Wallet (Send Offline) */}
                            <Stack.Screen
                                name="SendOfflineAmount"
                                component={SendOfflineAmount}
                                options={() => ({
                                    header: () => <SendBitcoinOfflineHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="SendOfflineQr"
                                component={SendOfflineQr}
                                options={() => ({
                                    header: () => <SendBitcoinOfflineHeader />,
                                })}
                            />
                            {/* Wallet (Receive) */}
                            <Stack.Screen
                                name="Receive"
                                component={Receive}
                                options={() => ({
                                    header: () => <ReceiveBitcoinHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="BitcoinRequest"
                                component={BitcoinRequest}
                                options={() => ({
                                    header: () => <BitcoinRequestHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="ReceiveSuccess"
                                component={ReceiveSuccess}
                                options={{ headerShown: false }}
                            />
                            {/* Wallet (Receive Offline) */}
                            <Stack.Screen
                                name="ReceiveOffline"
                                component={ReceiveOffline}
                                options={() => ({
                                    header: () => (
                                        <ReceiveBitcoinOfflineHeader />
                                    ),
                                })}
                            />
                            <Stack.Screen
                                name="ConfirmReceiveOffline"
                                component={ConfirmReceiveOffline}
                                options={() => ({
                                    header: () => (
                                        <ReceiveBitcoinOfflineHeader />
                                    ),
                                })}
                            />
                            {/* Federations */}
                            <Stack.Screen
                                name="FederationInvite"
                                component={FederationInvite}
                                options={() => ({
                                    header: () => <FederationInviteHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="ScanFederationCode"
                                component={ScanFederationCode}
                                options={() => ({
                                    header: () => <ScanFederationCodeHeader />,
                                })}
                            />
                            {/* Backup & Recovery */}
                            <Stack.Screen
                                name="ChooseBackupMethod"
                                component={ChooseBackupMethod}
                                options={() => ({
                                    header: () => <ChooseBackupMethodHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="ChooseRecoveryMethod"
                                component={ChooseRecoveryMethod}
                                options={() => ({
                                    header: () => (
                                        <ChooseRecoveryMethodHeader />
                                    ),
                                })}
                            />
                            {/* Social Backup */}
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
                            {/* Social Recovery */}
                            <Stack.Screen
                                name="LocateSocialRecovery"
                                component={LocateSocialRecovery}
                                options={() => ({
                                    header: () => (
                                        <SocialRecoveryHeader backButton />
                                    ),
                                })}
                            />
                            <Stack.Screen
                                name="SelectRecoveryFileSuccess"
                                component={SelectRecoveryFileSuccess}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="SelectRecoveryFileFailure"
                                component={SelectRecoveryFileFailure}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="CompleteSocialRecovery"
                                component={CompleteSocialRecovery}
                                options={() => ({
                                    header: () => (
                                        <SocialRecoveryHeader closeButton />
                                    ),
                                })}
                            />
                            <Stack.Screen
                                name="SocialRecoveryFailure"
                                component={SocialRecoveryFailure}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="SocialRecoverySuccess"
                                component={SocialRecoverySuccess}
                                options={{ headerShown: false }}
                            />
                            {/* Recovery Assist (Guardians) */}
                            <Stack.Screen
                                name="StartRecoveryAssist"
                                component={StartRecoveryAssist}
                                options={() => ({
                                    header: () => (
                                        <RecoveryAssistHeader backButton />
                                    ),
                                })}
                            />
                            <Stack.Screen
                                name="ScanSocialRecoveryCode"
                                component={ScanSocialRecoveryCode}
                                options={() => ({
                                    header: () => (
                                        <RecoveryAssistHeader
                                            backButton
                                            closeButton
                                        />
                                    ),
                                })}
                            />
                            <Stack.Screen
                                name="RecoveryAssistConfirmation"
                                component={RecoveryAssistConfirmation}
                                options={() => ({
                                    header: () => (
                                        <RecoveryAssistHeader backButton />
                                    ),
                                })}
                            />
                            <Stack.Screen
                                name="RecoveryAssistSuccess"
                                component={RecoveryAssistSuccess}
                                options={{ headerShown: false }}
                            />
                            {/* Personal Backup */}
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
                            {/* Personal Recovery */}
                            <Stack.Screen
                                name="PersonalRecovery"
                                component={PersonalRecovery}
                                options={() => ({
                                    header: () => (
                                        <PersonalRecoveryHeader backButton />
                                    ),
                                })}
                            />
                            <Stack.Screen
                                name="PersonalRecoverySuccess"
                                component={PersonalRecoverySuccess}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="RequestCameraAccess"
                                component={RequestCameraAccess}
                                options={{ headerShown: false }}
                                initialParams={{
                                    alternativeActionButton: null,
                                    nextScreen: 'ScanFederationCode',
                                    message: '',
                                }}
                            />
                            <Stack.Screen
                                name="SitesBrowser"
                                component={SitesBrowser}
                                options={{
                                    header: SitesHeader,
                                }}
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
                            <Stack.Screen
                                name="SocialRecoveryQrModal"
                                component={SocialRecoveryQrModal}
                                options={{
                                    presentation: 'transparentModal',
                                    headerShown: false,
                                }}
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
                                alternativeActionButton: null,
                                nextScreen: 'ScanFederationCode',
                                message: '',
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
