import { createDrawerNavigator } from '@react-navigation/drawer'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text, useTheme } from '@rneui/themed'
import React from 'react'

import BitcoinRequest from './screens/BitcoinRequest'
import ChatWallet from './screens/ChatWallet'
import ChooseBackupMethod from './screens/ChooseBackupMethod'
import ChooseRecoveryMethod from './screens/ChooseRecoveryMethod'
import CompleteRecoveryAssist from './screens/CompleteRecoveryAssist'
import CompleteSocialBackup from './screens/CompleteSocialBackup'
import CompleteSocialRecovery from './screens/CompleteSocialRecovery'
import ConfirmReceiveOffline from './screens/ConfirmReceiveOffline'
import ConfirmRecoveryAssist from './screens/ConfirmRecoveryAssist'
import ConfirmSendLightning from './screens/ConfirmSendLightning'
import ConfirmSendOnChain from './screens/ConfirmSendOnChain'
import CreateUsername from './screens/CreateUsername'
import DeveloperSettings from './screens/DeveloperSettings'
import DirectChat from './screens/DirectChat'
import EditGroup from './screens/EditGroup'
import Eula from './screens/Eula'
import FederationGreeting from './screens/FederationGreeting'
import FederationInvite from './screens/FederationInvite'
import FederationWelcome from './screens/FederationWelcome'
import GroupAdmin from './screens/GroupAdmin'
import GroupChat from './screens/GroupChat'
import GroupInvite from './screens/GroupInvite'
import Initializing from './screens/Initializing'
import JoinGroup from './screens/JoinGroup'
import LocateSocialRecovery from './screens/LocateSocialRecovery'
import NewMessage from './screens/NewMessage'
import PersonalBackupGuidance from './screens/PersonalBackupGuidance'
import PersonalBackupSuccess from './screens/PersonalBackupSuccess'
import PersonalRecovery from './screens/PersonalRecovery'
import PersonalRecoverySuccess from './screens/PersonalRecoverySuccess'
import Receive from './screens/Receive'
import ReceiveOffline from './screens/ReceiveOffline'
import ReceiveSuccess from './screens/ReceiveSuccess'
import RecordBackupVideo from './screens/RecordBackupVideo'
import RecoveryAssistSuccess from './screens/RecoveryAssistSuccess'
import RecoveryWords from './screens/RecoveryWords'
import ScanFederationCode from './screens/ScanFederationCode'
import ScanSocialRecoveryCode from './screens/ScanSocialRecoveryCode'
import SelectRecoveryFileFailure from './screens/SelectRecoveryFileFailure'
import SelectRecoveryFileSuccess from './screens/SelectRecoveryFileSuccess'
import Send from './screens/Send'
import SendOfflineAmount from './screens/SendOfflineAmount'
import SendOfflineQr from './screens/SendOfflineQr'
import SendSuccess from './screens/SendSuccess'
import SocialBackupCloudUpload from './screens/SocialBackupCloudUpload'
import SocialBackupGuidance from './screens/SocialBackupGuidance'
import SocialBackupProcessing from './screens/SocialBackupProcessing'
import SocialBackupSuccess from './screens/SocialBackupSuccess'
import SocialRecoveryFailure from './screens/SocialRecoveryFailure'
import SocialRecoveryQrModal from './screens/SocialRecoveryQrModal'
import SocialRecoverySuccess from './screens/SocialRecoverySuccess'
import Splash from './screens/Splash'
import StartPersonalBackup from './screens/StartPersonalBackup'
import StartRecoveryAssist from './screens/StartRecoveryAssist'
import StartSocialBackup from './screens/StartSocialBackup'
import TabsNavigator from './screens/TabsNavigator'
import Transactions from './screens/Transactions'

import ChooseBackupMethodHeader from './components/feature/backup/ChooseBackupMethodHeader'
import PersonalBackupHeader from './components/feature/backup/PersonalBackupHeader'
import RecoveryWordsHeader from './components/feature/backup/RecoveryWordsHeader'
import SocialBackupHeader from './components/feature/backup/SocialBackupHeader'
import ChatWalletHeader from './components/feature/chat/ChatWalletHeader'
import DirectChatHeader from './components/feature/chat/DirectChatHeader'
import EditGroupHeader from './components/feature/chat/EditGroupHeader'
import GroupAdminHeader from './components/feature/chat/GroupAdminHeader'
import GroupHeader from './components/feature/chat/GroupHeader'
import GroupInviteHeader from './components/feature/chat/GroupInviteHeader'
import JoinGroupHeader from './components/feature/chat/JoinGroupHeader'
import NewMessageHeader from './components/feature/chat/NewMessageHeader'
import ConnectedFederationsDrawer from './components/feature/federations/ConnectedFederationsDrawer'
import FederationInviteHeader from './components/feature/federations/FederationInviteHeader'
import ScanFederationCodeHeader from './components/feature/federations/ScanFederationCodeHeader'
import SelectedFederationHeader from './components/feature/federations/SelectedFederationHeader'
import EulaHeader from './components/feature/onboarding/EulaHeader'
import NewMemberHeader from './components/feature/onboarding/NewMemberHeader'
import BitcoinRequestHeader from './components/feature/receive/BitcoinRequestHeader'
import ReceiveBitcoinHeader from './components/feature/receive/ReceiveBitcoinHeader'
import ReceiveBitcoinOfflineHeader from './components/feature/receive/ReceiveBitcoinOfflineHeader'
import ChooseRecoveryMethodHeader from './components/feature/recovery/ChooseRecoveryMethodHeader'
import PersonalRecoveryHeader from './components/feature/recovery/PersonalRecoveryHeader'
import RecoveryAssistHeader from './components/feature/recovery/RecoveryAssistHeader'
import SocialRecoveryHeader from './components/feature/recovery/SocialRecoveryHeader'
import SendBitcoinHeader from './components/feature/send/SendBitcoinHeader'
import SendBitcoinOfflineHeader from './components/feature/send/SendBitcoinOfflineHeader'
import SendHeader from './components/feature/send/SendHeader'
import TransactionsHeader from './components/feature/transaction-history/TransactionsHeader'

import SendBitcoinOfflineQrHeader from './components/feature/send/SendBitcoinOfflineQrHeader'
import Header from './components/ui/Header'
import SitesBrowser from './screens/SitesBrowser'
import { useFederationsContext } from './state/contexts/FederationsContext'
import { MSats } from './types'
import {
    MainNavigatorDrawerParamList,
    MAIN_NAVIGATOR_ID,
    NavigationLinkingConfig,
    RootStackParamList,
} from './types/navigation'

const Stack = createNativeStackNavigator<RootStackParamList>()
const Drawer = createDrawerNavigator<MainNavigatorDrawerParamList>()

const MainNavigator = () => {
    const {
        state: { selectedFederation },
    } = useFederationsContext()

    return (
        <Stack.Navigator
            screenOptions={{
                orientation: 'portrait',
            }}
            initialRouteName={'Initializing'}
            id={MAIN_NAVIGATOR_ID}>
            <>
                {/* This group of screens may render regardless of the value of
                 selectedFederation */}
                <Stack.Group
                    screenOptions={{
                        animation: 'fade',
                        animationDuration: 250,
                    }}>
                    <Stack.Screen
                        name="Splash"
                        component={Splash}
                        options={{
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="Initializing"
                        component={Initializing}
                        initialParams={{ reset: false }}
                        options={{
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="ScanFederationCode"
                        component={ScanFederationCode}
                        options={() => ({
                            header: () => <ScanFederationCodeHeader />,
                        })}
                    />
                    <Stack.Screen
                        name="Eula"
                        component={Eula}
                        options={{
                            header: () => <EulaHeader />,
                        }}
                    />
                </Stack.Group>
                {/*
                    This group of screens relies on a non-null selectedFederation
                    in the FederationsContext because they contain API calls to
                    the FFI NativeModule. Since it is possible to store multiple
                    federation connections in-app, each call requires a
                    Federation to be specified
                */}
                {selectedFederation !== null && (
                    <Stack.Group>
                        <Stack.Group
                            screenOptions={{
                                animation: 'fade',
                                animationDuration: 250,
                            }}>
                            <Stack.Screen
                                name="TabsNavigator"
                                component={TabsNavigator}
                                options={() => ({
                                    headerShown: false,
                                })}
                            />
                            {/* Sites */}
                            <Stack.Screen
                                name="SitesBrowser"
                                component={SitesBrowser}
                                options={{
                                    headerShown: false,
                                }}
                            />
                            {/* Federation Onboarding */}
                            <Stack.Screen
                                name="FederationWelcome"
                                component={FederationWelcome}
                                options={() => ({
                                    header: () => <SelectedFederationHeader />,
                                    animation: 'fade',
                                    animationDuration: 300,
                                })}
                            />
                            <Stack.Screen
                                name="CreateUsername"
                                component={CreateUsername}
                                options={() => ({
                                    header: () => (
                                        <>
                                            <SelectedFederationHeader />
                                            <NewMemberHeader />
                                        </>
                                    ),
                                    animation: 'fade',
                                    animationDuration: 300,
                                })}
                            />
                            <Stack.Screen
                                name="FederationGreeting"
                                component={FederationGreeting}
                                options={{ headerShown: false }}
                            />
                            {/* Chat */}
                            <Stack.Screen
                                name="NewMessage"
                                component={NewMessage}
                                options={() => ({
                                    header: () => <NewMessageHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="JoinGroup"
                                component={JoinGroup}
                                options={() => ({
                                    header: () => <JoinGroupHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="GroupInvite"
                                component={GroupInvite}
                                options={() => ({
                                    header: () => <GroupInviteHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="DirectChat"
                                component={DirectChat}
                                options={() => ({
                                    header: () => <DirectChatHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="GroupChat"
                                component={GroupChat}
                                options={() => ({
                                    header: () => <GroupHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="EditGroup"
                                component={EditGroup}
                                options={() => ({
                                    header: () => <EditGroupHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="GroupAdmin"
                                component={GroupAdmin}
                                options={() => ({
                                    header: () => <GroupAdminHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="ChatWallet"
                                component={ChatWallet}
                                options={() => ({
                                    header: () => <ChatWalletHeader />,
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
                                initialParams={{
                                    amount: 0 as MSats,
                                    unit: 'sats',
                                }}
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
                                    header: () => (
                                        <SendBitcoinOfflineQrHeader />
                                    ),
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
                                name="SocialBackupGuidance"
                                component={SocialBackupGuidance}
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
                                name="ConfirmRecoveryAssist"
                                component={ConfirmRecoveryAssist}
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
                                name="CompleteRecoveryAssist"
                                component={CompleteRecoveryAssist}
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
                                name="PersonalBackupGuidance"
                                component={PersonalBackupGuidance}
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
                                name="DeveloperSettings"
                                component={DeveloperSettings}
                                options={() => ({
                                    header: () => (
                                        <Header
                                            backButton
                                            headerCenter={
                                                <Text>
                                                    {'Developer Settings'}
                                                </Text>
                                            }
                                        />
                                    ),
                                })}
                            />
                        </Stack.Group>
                        {/* Put all Overlay/Modal screens here */}
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
                )}
            </>
        </Stack.Navigator>
    )
}

const linking: NavigationLinkingConfig = {
    prefixes: ['fedi://', 'lightning:', 'bitcoin:'],
    config: {
        screens: {
            MainNavigator: {
                screens: {
                    TabsNavigator: 'tabs-navigator',
                    // Wallet (Send)
                    Send: 'send',
                    ConfirmSendLightning: 'confirm-send-lightning',
                    ConfirmSendOnChain: 'confirm-send-on-chain',
                    ConfirmReceiveOnChain: 'confirm-receive-on-chain',
                    SendSuccess: 'send-success',
                    SendOfflineAmount: 'send-offline-amount',
                    SendOfflineQr: 'send-offline-qr',
                    // Wallet (Send)
                    Receive: 'receive',
                    BitcoinRequest: 'bitcoin-request',
                    ReceiveSuccess: 'receive-success',
                    ReceiveOffline: 'receive-offline',
                    ConfirmReceiveOffline: 'confirm-receive-offline',
                    // Federations
                    FederationInvite: 'federation-invite',
                    ScanFederationCode: 'scan-federation-code',
                    // Backup & Recovery
                    ChooseBackupMethod: 'choose-backup-method',
                    ChooseRecoveryMethod: 'choose-recovery-method',
                    // Social Backup
                    RecordBackupVideo: 'record-backup-video',
                    StartSocialBackup: 'start-social-backup',
                    SocialBackupProcessing: 'social-backup-processing',
                    SocialBackupCloudUpload: 'social-backup-cloud-upload',
                    CompleteSocialBackup: 'complete-social-backup',
                    SocialBackupSuccess: 'social-backup-success',
                    // Social Recovery
                    LocateSocialRecovery: 'locate-social-recovery',
                    SelectRecoveryFileSuccess: 'select-recovery-file-success',
                    SelectRecoveryFileFailure: 'select-recovery-file-failure',
                    CompleteSocialRecovery: 'complete-social-recovery',
                    SocialRecoveryFailure: 'social-recovery-failure',
                    SocialRecoverySuccess: 'social-recovery-success',
                    SocialRecoveryAssist: 'social-recovery-assist',
                    ScanSocialRecoveryCode: 'scan-social-recovery-code',
                    CompleteRecoveryAssist: 'recovery-assist-confirmation',
                    RecoveryAssistSuccess: 'recovery-assist-success',
                    // Personal Backup
                    StartPersonalBackup: 'start-personal-backup',
                    RecoveryWords: 'recovery-words',
                    PersonalBackupSuccess: 'personal-backup-success',
                    // Personal Recovery
                    PersonalRecovery: 'personal-recovery',
                    PersonalRecoverySuccess: 'personal-recovery-success',
                    RequestCameraAccess: 'request-camera-access',
                    // Modals
                    Transactions: 'transactions',
                    SocialRecoveryQrModal: 'social-recovery-qr-modal',
                    // No federation
                    Splash: 'splash',
                },
            },
        },
    },
}

const Router = () => {
    const { theme } = useTheme()

    return (
        <NavigationContainer theme={theme} linking={linking}>
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
