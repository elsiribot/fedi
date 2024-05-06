import { createDrawerNavigator } from '@react-navigation/drawer'
import {
    NavigationContainer,
    useNavigation,
    useNavigationContainerRef,
} from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useRef } from 'react'

import { useLockedDeviceDetection } from '@fedi/common/hooks/recovery'
import { useToast } from '@fedi/common/hooks/toast'
import { selectSocialRecoveryState } from '@fedi/common/redux'
import { makeLog } from '@fedi/common/utils/log'

import { fedimint } from './bridge'
import AddFediModHeader from './components/feature/admin/AddFediModHeader'
import CurrencySettingsHeader from './components/feature/admin/CurrencySettingsHeader'
import EditProfileSettingsHeader from './components/feature/admin/EditProfileSettingsHeader'
import FediModSettingsHeader from './components/feature/admin/FediModSettingsHeader'
import LanguageSettingsHeader from './components/feature/admin/LanguageSettingsHeader'
import SettingsHeader from './components/feature/admin/SettingsHeader'
import ChooseBackupMethodHeader from './components/feature/backup/ChooseBackupMethodHeader'
import PersonalBackupHeader from './components/feature/backup/PersonalBackupHeader'
import RecoveryWordsHeader from './components/feature/backup/RecoveryWordsHeader'
import SocialBackupHeader from './components/feature/backup/SocialBackupHeader'
import BugReportHeader from './components/feature/bug/BugReportHeader'
import ChatConversationHeader from './components/feature/chat/ChatConversationHeader'
import ChatRoomInviteHeader from './components/feature/chat/ChatRoomInviteHeader'
import ChatRoomMembersHeader from './components/feature/chat/ChatRoomMembersHeader'
import ChatWalletHeader from './components/feature/chat/ChatWalletHeader'
import ConfirmChatSendHeader from './components/feature/chat/ConfirmChatSendHeader'
import CreateGroupHeader from './components/feature/chat/CreateGroupHeader'
import DirectChatHeader from './components/feature/chat/DirectChatHeader'
import EditGroupHeader from './components/feature/chat/EditGroupHeader'
import GroupAdminHeader from './components/feature/chat/GroupAdminHeader'
import GroupHeader from './components/feature/chat/GroupHeader'
import GroupInviteHeader from './components/feature/chat/GroupInviteHeader'
import MemberQrCodeHeader from './components/feature/chat/MemberQrCodeHeader'
import NewMessageHeader from './components/feature/chat/NewMessageHeader'
import ScanMemberCodeHeader from './components/feature/chat/ScanMemberCodeHeader'
import ConnectedFederationsDrawer from './components/feature/federations/ConnectedFederationsDrawer'
import FederationInviteHeader from './components/feature/federations/FederationInviteHeader'
import JoinFederationHeader from './components/feature/federations/JoinFederationHeader'
import SelectedFederationHeader from './components/feature/federations/SelectedFederationHeader'
import HomeLockScreen from './components/feature/home/LockScreen'
import { OmniLinkHandler } from './components/feature/omni/OmniLinkHandler'
import EulaHeader from './components/feature/onboarding/EulaHeader'
import NewMemberHeader from './components/feature/onboarding/NewMemberHeader'
import ChangePinLockScreenHeader from './components/feature/pin/ChangePinLockScreenHeader'
import CreatePinInstructionsHeader from './components/feature/pin/CreatePinInstructionsHeader'
import PinAccessHeader from './components/feature/pin/PinAccessHeader'
import ResetPinHeader from './components/feature/pin/ResetPinHeader'
import ResetPinStartHeader from './components/feature/pin/ResetPinStartHeader'
import SetPinHeader from './components/feature/pin/SetPinHeader'
import SetPinLockScreen from './components/feature/pin/SetPinLockScreen'
import UnlockAppLockScreenHeader from './components/feature/pin/UnlockAppLockScreenHeader'
import BitcoinRequestHeader from './components/feature/receive/BitcoinRequestHeader'
import ReceiveBitcoinHeader from './components/feature/receive/ReceiveBitcoinHeader'
import ReceiveBitcoinOfflineHeader from './components/feature/receive/ReceiveBitcoinOfflineHeader'
import ReceiveLightningHeader from './components/feature/receive/ReceiveLightningHeader'
import ChooseRecoveryMethodHeader from './components/feature/recovery/ChooseRecoveryMethodHeader'
import PersonalRecoveryHeader from './components/feature/recovery/PersonalRecoveryHeader'
import RecoveryAssistHeader from './components/feature/recovery/RecoveryAssistHeader'
import RecoveryDeviceSelectionHeader from './components/feature/recovery/RecoveryDeviceSelectionHeader'
import RecoveryNewWalletHeader from './components/feature/recovery/RecoveryNewWalletHeader'
import RecoveryWalletTransferHeader from './components/feature/recovery/RecoveryWalletTransferHeader'
import SocialRecoveryHeader from './components/feature/recovery/SocialRecoveryHeader'
import ConfirmSendEcashHeader from './components/feature/send/ConfirmSendEcashHeader'
import SendBitcoinHeader from './components/feature/send/SendBitcoinHeader'
import SendBitcoinOfflineHeader from './components/feature/send/SendBitcoinOfflineHeader'
import SendBitcoinOfflineQrHeader from './components/feature/send/SendBitcoinOfflineQrHeader'
import SendHeader from './components/feature/send/SendHeader'
import ConfirmDepositHeader from './components/feature/stabilitypool/ConfirmDepositHeader'
import ConfirmWithdrawHeader from './components/feature/stabilitypool/ConfirmWithdrawHeader'
import DepositInitiatedHeader from './components/feature/stabilitypool/DepositInitiatedHeader'
import StabilityDepositHeader from './components/feature/stabilitypool/StabilityDepositHeader'
import StabilityHistoryHeader from './components/feature/stabilitypool/StabilityHistoryHeader'
import StabilityHomeHeader from './components/feature/stabilitypool/StabilityHomeHeader'
import StabilityWithdrawHeader from './components/feature/stabilitypool/StabilityWithdrawHeader'
import StableBalanceIntroHeader from './components/feature/stabilitypool/StableBalanceIntroHeader'
import WithdrawInitiatedHeader from './components/feature/stabilitypool/WithdrawInitiatedHeader'
import TransactionsHeader from './components/feature/transaction-history/TransactionsHeader'
import Header from './components/ui/Header'
import AddFediMod from './screens/AddFediMod'
import BitcoinRequest from './screens/BitcoinRequest'
import BugReport from './screens/BugReport'
import BugReportSuccess from './screens/BugReportSuccess'
import ChatRoomConversation from './screens/ChatRoomConversation'
import ChatRoomInvite from './screens/ChatRoomInvite'
import ChatRoomMembers from './screens/ChatRoomMembers'
import ChatUserConversation from './screens/ChatUserConversation'
import ChatWallet from './screens/ChatWallet'
import ChooseBackupMethod from './screens/ChooseBackupMethod'
import ChooseRecoveryMethod from './screens/ChooseRecoveryMethod'
import CompleteRecoveryAssist from './screens/CompleteRecoveryAssist'
import CompleteSocialBackup from './screens/CompleteSocialBackup'
import CompleteSocialRecovery from './screens/CompleteSocialRecovery'
import ConfirmReceiveOffline from './screens/ConfirmReceiveOffline'
import ConfirmRecoveryAssist from './screens/ConfirmRecoveryAssist'
import ConfirmSendChatPayment from './screens/ConfirmSendChatPayment'
import ConfirmSendEcash from './screens/ConfirmSendEcash'
import ConfirmSendLightning from './screens/ConfirmSendLightning'
import ConfirmSendOnChain from './screens/ConfirmSendOnChain'
import CreateGroup from './screens/CreateGroup'
import CreatePinInstructions from './screens/CreatePinInstructions'
import CreatedPin from './screens/CreatedPin'
import CurrencySettings from './screens/CurrencySettings'
import DeveloperSettings from './screens/DeveloperSettings'
import DirectChat from './screens/DirectChat'
import EditGroup from './screens/EditGroup'
import EditProfileSettings from './screens/EditProfileSettings'
import EnterDisplayName from './screens/EnterDisplayName'
import Eula from './screens/Eula'
import FederationGreeting from './screens/FederationGreeting'
import FederationInvite from './screens/FederationInvite'
import FediModBrowser from './screens/FediModBrowser'
import FediModSettings from './screens/FediModSettings'
import GroupAdmin from './screens/GroupAdmin'
import GroupChat from './screens/GroupChat'
import GroupInvite from './screens/GroupInvite'
import Initializing from './screens/Initializing'
import JoinFederation from './screens/JoinFederation'
import LanguageSettings from './screens/LanguageSettings'
import LocateSocialRecovery from './screens/LocateSocialRecovery'
import LockedDevice from './screens/LockedDevice'
import MemberQrCode from './screens/MemberQrCode'
import NewMessage from './screens/NewMessage'
import PersonalRecovery from './screens/PersonalRecovery'
import PersonalRecoverySuccess from './screens/PersonalRecoverySuccess'
import PinAccess from './screens/PinAccess'
import PopupFederationEnded from './screens/PopupFederationEnded'
import PublicFederations from './screens/PublicFederations'
import Receive from './screens/Receive'
import ReceiveLightning from './screens/ReceiveLightning'
import ReceiveSuccess from './screens/ReceiveSuccess'
import RecordBackupVideo from './screens/RecordBackupVideo'
import RecoveryAssistSuccess from './screens/RecoveryAssistSuccess'
import RecoveryDeviceSelection from './screens/RecoveryDeviceSelection'
import RecoveryNewWallet from './screens/RecoveryNewWallet'
import RecoveryWalletOptions from './screens/RecoveryWalletOptions'
import RecoveryWalletTransfer from './screens/RecoveryWalletTransfer'
import RecoveryWords from './screens/RecoveryWords'
import ResetPin from './screens/ResetPin'
import ResetPinStart from './screens/ResetPinStart'
import ScanMemberCode from './screens/ScanMemberCode'
import ScanSocialRecoveryCode from './screens/ScanSocialRecoveryCode'
import SelectRecoveryFileFailure from './screens/SelectRecoveryFileFailure'
import SelectRecoveryFileSuccess from './screens/SelectRecoveryFileSuccess'
import Send from './screens/Send'
import SendOfflineAmount from './screens/SendOfflineAmount'
import SendOfflineQr from './screens/SendOfflineQr'
import SendOnChainAmount from './screens/SendOnChainAmount'
import SendSuccess from './screens/SendSuccess'
import SetPin from './screens/SetPin'
import Settings from './screens/Settings'
import SocialBackupCloudUpload from './screens/SocialBackupCloudUpload'
import SocialBackupProcessing from './screens/SocialBackupProcessing'
import SocialBackupSuccess from './screens/SocialBackupSuccess'
import SocialRecoveryFailure from './screens/SocialRecoveryFailure'
import SocialRecoveryQrModal from './screens/SocialRecoveryQrModal'
import SocialRecoverySuccess from './screens/SocialRecoverySuccess'
import Splash from './screens/Splash'
import StabilityConfirmDeposit from './screens/StabilityConfirmDeposit'
import StabilityConfirmWithdraw from './screens/StabilityConfirmWithdraw'
import StabilityDeposit from './screens/StabilityDeposit'
import StabilityDepositInitiated from './screens/StabilityDepositInitiated'
import StabilityHistory from './screens/StabilityHistory'
import StabilityHome from './screens/StabilityHome'
import StabilityWithdraw from './screens/StabilityWithdraw'
import StabilityWithdrawInitiated from './screens/StabilityWithdrawInitiated'
import StableBalanceIntro from './screens/StableBalanceIntro'
import StartPersonalBackup from './screens/StartPersonalBackup'
import StartRecoveryAssist from './screens/StartRecoveryAssist'
import StartSocialBackup from './screens/StartSocialBackup'
import SwitchingFederations from './screens/SwitchingFederations'
import TabsNavigator from './screens/TabsNavigator'
import Transactions from './screens/Transactions'
import { useAppSelector, useMatrixPushNotifications } from './state/hooks'
import {
    resetAfterPersonalRecovery,
    resetToLockedDevice,
    resetToSocialRecovery,
} from './state/navigation'
import { MSats } from './types'
import {
    MainNavigatorDrawerParamList,
    MAIN_NAVIGATOR_ID,
    NavigationLinkingConfig,
    RootStackParamList,
    DRAWER_NAVIGATION_ID,
} from './types/navigation'
import { useIsFeatureUnlocked } from './utils/hooks/security'

const log = makeLog('NavigationRouter')

const Stack = createNativeStackNavigator<RootStackParamList>()
const Drawer = createDrawerNavigator<MainNavigatorDrawerParamList>()

const MainNavigator = () => {
    const isAppUnlocked = useIsFeatureUnlocked('app')
    const isChangePinUnlocked = useIsFeatureUnlocked('changePin')
    const socialRecoveryState = useAppSelector(selectSocialRecoveryState)
    const deviceIndexRequired = useAppSelector(
        s => s.recovery.deviceIndexRequired,
    )
    const navigation = useNavigation()

    useEffect(() => {
        if (socialRecoveryState && navigation) {
            navigation.dispatch(resetToSocialRecovery())
        }
    }, [navigation, socialRecoveryState])

    // Navigates to personal recovery success since this means the user entered
    // seed words but quit the app before completing device index selection
    useEffect(() => {
        if (deviceIndexRequired && navigation) {
            navigation.dispatch(resetAfterPersonalRecovery())
        }
    }, [navigation, deviceIndexRequired])

    // TODO: this navigation effect might be racey so we make sure it
    // throws and retires inside the effect... we should refactor it...
    // Navigates to locked device screen if we detect a device conflict
    useLockedDeviceDetection(fedimint, () => {
        navigation.dispatch(resetToLockedDevice())
    })

    return (
        <Stack.Navigator
            screenOptions={{
                orientation: 'portrait',
            }}
            initialRouteName={'Initializing'}
            id={MAIN_NAVIGATOR_ID}>
            <>
                {/* This group of screens may render regardless of the value of
                 activeFederation */}
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
                        options={{
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="JoinFederation"
                        component={JoinFederation}
                        options={() => ({
                            header: () => <JoinFederationHeader />,
                        })}
                    />
                    <Stack.Screen
                        name="PublicFederations"
                        component={PublicFederations}
                        options={() => ({
                            header: () => <Header backButton />,
                        })}
                    />
                    <Stack.Screen
                        name="Eula"
                        component={Eula}
                        options={{
                            header: () => <EulaHeader />,
                        }}
                    />
                    <Stack.Screen
                        name="PersonalRecoverySuccess"
                        component={PersonalRecoverySuccess}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="RecoveryWalletOptions"
                        component={RecoveryWalletOptions}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="RecoveryWalletTransfer"
                        component={RecoveryWalletTransfer}
                        options={() => ({
                            header: () => <RecoveryWalletTransferHeader />,
                        })}
                    />
                    <Stack.Screen
                        name="RecoveryNewWallet"
                        component={RecoveryNewWallet}
                        options={() => ({
                            header: () => <RecoveryNewWalletHeader />,
                        })}
                    />
                    <Stack.Screen
                        name="RecoveryDeviceSelection"
                        component={RecoveryDeviceSelection}
                        options={() => ({
                            header: () => <RecoveryDeviceSelectionHeader />,
                        })}
                    />
                    <Stack.Screen
                        name="LockedDevice"
                        component={LockedDevice}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="CompleteSocialRecovery"
                        component={CompleteSocialRecovery}
                        options={() => ({
                            header: () => <SocialRecoveryHeader cancelButton />,
                        })}
                    />
                </Stack.Group>
                {/*
                    This group of screens relies on a non-null activeFederation
                    in the federation reducer because they contain API calls to
                    the FFI NativeModule. Since it is possible to store multiple
                    federation connections in-app, each call requires a
                    Federation to be specified
                */}
                {isAppUnlocked ? (
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
                            {/* FediMods */}
                            <Stack.Screen
                                name="FediModBrowser"
                                component={FediModBrowser}
                                options={{
                                    headerShown: false,
                                }}
                            />
                            {/* Federation Onboarding */}
                            <Stack.Screen
                                name="EnterDisplayName"
                                component={EnterDisplayName}
                                options={() => ({
                                    header: () => <NewMemberHeader />,
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
                                name="GroupInvite"
                                component={GroupInvite}
                                options={() => ({
                                    header: () => <GroupInviteHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="MemberQrCode"
                                component={MemberQrCode}
                                options={() => ({
                                    header: () => <MemberQrCodeHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="ScanMemberCode"
                                component={ScanMemberCode}
                                options={() => ({
                                    header: () => <ScanMemberCodeHeader />,
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
                                name="ChatRoomConversation"
                                component={ChatRoomConversation}
                                options={() => ({
                                    header: () => <ChatConversationHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="ChatRoomMembers"
                                component={ChatRoomMembers}
                                options={() => ({
                                    header: () => <ChatRoomMembersHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="ChatRoomInvite"
                                component={ChatRoomInvite}
                                options={() => ({
                                    header: () => <ChatRoomInviteHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="ChatUserConversation"
                                component={ChatUserConversation}
                                options={() => ({
                                    header: () => <ChatConversationHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="CreateGroup"
                                component={CreateGroup}
                                options={() => ({
                                    header: () => <CreateGroupHeader />,
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
                            <Stack.Screen
                                name="ConfirmSendChatPayment"
                                component={ConfirmSendChatPayment}
                                options={() => ({
                                    header: () => <ConfirmChatSendHeader />,
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
                                name="SendOnChainAmount"
                                component={SendOnChainAmount}
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
                                name="ConfirmSendEcash"
                                component={ConfirmSendEcash}
                                options={() => ({
                                    header: () => <ConfirmSendEcashHeader />,
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
                                name="ReceiveLightning"
                                component={ReceiveLightning}
                                options={() => ({
                                    header: () => <ReceiveLightningHeader />,
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
                            <Stack.Screen
                                name="ReceiveSuccess"
                                component={ReceiveSuccess}
                                options={{ headerShown: false }}
                            />
                            {/* Transaction history */}
                            <Stack.Screen
                                name="Transactions"
                                component={Transactions}
                                options={() => ({
                                    header: () => <TransactionsHeader />,
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
                                name="RecoveryWords"
                                component={RecoveryWords}
                                options={() => ({
                                    header: () => <RecoveryWordsHeader />,
                                })}
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
                            {/* Popup federations */}
                            <Stack.Screen
                                name="PopupFederationEnded"
                                component={PopupFederationEnded}
                                options={() => ({
                                    header: () => <SelectedFederationHeader />,
                                })}
                            />
                            {/* Settings */}
                            <Stack.Screen
                                name="Settings"
                                component={Settings}
                                options={() => ({
                                    header: () => <SettingsHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="FediModSettings"
                                component={FediModSettings}
                                options={() => ({
                                    header: () => <FediModSettingsHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="AddFediMod"
                                component={AddFediMod}
                                options={() => ({
                                    header: () => <AddFediModHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="EditProfileSettings"
                                component={EditProfileSettings}
                                options={() => ({
                                    header: () => <EditProfileSettingsHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="LanguageSettings"
                                component={LanguageSettings}
                                options={() => ({
                                    header: () => <LanguageSettingsHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="CurrencySettings"
                                component={CurrencySettings}
                                options={() => ({
                                    header: () => <CurrencySettingsHeader />,
                                })}
                            />
                            {isChangePinUnlocked ? (
                                <Stack.Group>
                                    <Stack.Screen
                                        name="SetPin"
                                        component={SetPin}
                                        options={() => ({
                                            header: () => <SetPinHeader />,
                                        })}
                                    />
                                </Stack.Group>
                            ) : (
                                <Stack.Group>
                                    <Stack.Screen
                                        name="SetPin"
                                        component={SetPinLockScreen}
                                        options={() => ({
                                            header: () => (
                                                <ChangePinLockScreenHeader />
                                            ),
                                        })}
                                    />
                                </Stack.Group>
                            )}
                            <Stack.Screen
                                name="CreatedPin"
                                component={CreatedPin}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="CreatePinInstructions"
                                component={CreatePinInstructions}
                                options={() => ({
                                    header: () => (
                                        <CreatePinInstructionsHeader />
                                    ),
                                })}
                            />
                            <Stack.Screen
                                name="PinAccess"
                                component={PinAccess}
                                options={() => ({
                                    header: () => <PinAccessHeader />,
                                })}
                            />
                            {/* Stability Pools */}
                            <Stack.Screen
                                name="StabilityHome"
                                component={StabilityHome}
                                options={() => ({
                                    header: () => <StabilityHomeHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="StabilityHistory"
                                component={StabilityHistory}
                                options={() => ({
                                    header: () => <StabilityHistoryHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="StabilityDeposit"
                                component={StabilityDeposit}
                                options={() => ({
                                    header: () => <StabilityDepositHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="StabilityWithdraw"
                                component={StabilityWithdraw}
                                options={() => ({
                                    header: () => <StabilityWithdrawHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="StabilityConfirmDeposit"
                                component={StabilityConfirmDeposit}
                                options={() => ({
                                    header: () => <ConfirmDepositHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="StabilityConfirmWithdraw"
                                component={StabilityConfirmWithdraw}
                                options={() => ({
                                    header: () => <ConfirmWithdrawHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="StabilityDepositInitiated"
                                component={StabilityDepositInitiated}
                                options={() => ({
                                    header: () => <DepositInitiatedHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="StabilityWithdrawInitiated"
                                component={StabilityWithdrawInitiated}
                                options={() => ({
                                    header: () => <WithdrawInitiatedHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="StableBalanceIntro"
                                component={StableBalanceIntro}
                                options={() => ({
                                    header: () => <StableBalanceIntroHeader />,
                                })}
                            />
                            {/* Bug report */}
                            <Stack.Screen
                                name="BugReport"
                                component={BugReport}
                                options={() => ({
                                    header: () => <BugReportHeader />,
                                })}
                            />
                            <Stack.Screen
                                name="BugReportSuccess"
                                component={BugReportSuccess}
                                options={{ headerShown: false }}
                            />
                            {/* Developer-only */}
                            <Stack.Screen
                                name="DeveloperSettings"
                                component={DeveloperSettings}
                                options={() => ({
                                    header: () => (
                                        <Header
                                            backButton
                                            headerCenter={
                                                <Text
                                                    bold
                                                    numberOfLines={1}
                                                    adjustsFontSizeToFit>
                                                    {'Developer Settings'}
                                                </Text>
                                            }
                                        />
                                    ),
                                })}
                            />
                        </Stack.Group>
                        {/* Put all Overlay/Modal screens here */}
                        <Stack.Group>
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
                    <Stack.Group>
                        <Stack.Screen
                            name="TabsNavigator"
                            component={HomeLockScreen}
                            options={{
                                header: () => <UnlockAppLockScreenHeader />,
                            }}
                        />
                        <Stack.Screen
                            name="ResetPinStart"
                            component={ResetPinStart}
                            options={{
                                header: () => <ResetPinStartHeader />,
                            }}
                        />
                        <Stack.Screen
                            name="ResetPin"
                            component={ResetPin}
                            options={{
                                header: () => <ResetPinHeader />,
                            }}
                        />
                    </Stack.Group>
                )}
            </>
        </Stack.Navigator>
    )
}

const linking: NavigationLinkingConfig = {
    prefixes: [
        'fedi:',
        'lightning:',
        'bitcoin:',
        'lnurlw://',
        'lnurlp://',
        'keyauth://',
    ],
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
                    ConfirmSendOfflineAmount: 'confirm-send-offline-amount',
                    // Wallet (Receive)
                    Receive: 'receive',
                    BitcoinRequest: 'bitcoin-request',
                    ReceiveSuccess: 'receive-success',
                    // Federations
                    FederationInvite: 'federation-invite',
                    JoinFederation: 'join-federation',
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
                    // Personal Recovery
                    PersonalRecovery: 'personal-recovery',
                    PersonalRecoverySuccess: 'personal-recovery-success',
                    RequestCameraAccess: 'request-camera-access',
                    // Modals
                    Transactions: 'transactions',
                    SocialRecoveryQrModal: 'social-recovery-qr-modal',
                    // No federation
                    Splash: 'splash',
                    // Omni scanner
                    OmniScanner: 'omni-scanner',
                },
            },
        },
    },
}

const Router = () => {
    const { theme } = useTheme()
    const navigation = useNavigationContainerRef()

    const toast = useToast()
    const routeRef = useRef<string>()

    // Makes sure to check XMPP socket health when app is foregrounded
    // useXmppHealthCheck()

    // Publishes an FCM push notification token if chat is available
    useMatrixPushNotifications()

    // Logs changes in navigation state for debugging
    const handleStateChange = useCallback(() => {
        toast.close()
        const previousRoute = routeRef.current
        const currentRoute = navigation.getCurrentRoute()

        if (previousRoute === currentRoute?.name) return

        routeRef.current = currentRoute?.name
        log.debug(
            `Navigating from "${previousRoute}" to "${routeRef.current}"`,
            {
                params: currentRoute?.params,
            },
        )
    }, [navigation, toast])

    return (
        <NavigationContainer
            ref={navigation}
            theme={theme}
            linking={linking}
            onReady={() => {
                routeRef.current = navigation.getCurrentRoute()?.name
                log.debug('Navigation is ready', {
                    route: routeRef.current,
                })
            }}
            onStateChange={handleStateChange}>
            <Drawer.Navigator
                id={DRAWER_NAVIGATION_ID}
                drawerContent={ConnectedFederationsDrawer}>
                <Drawer.Screen
                    name="MainNavigator"
                    component={MainNavigator}
                    options={{ headerShown: false }}
                />
                <Drawer.Screen
                    name="SwitchingFederations"
                    component={SwitchingFederations}
                    initialParams={{ federationId: null }}
                    options={{
                        headerShown: false,
                    }}
                />
            </Drawer.Navigator>
            <OmniLinkHandler />
        </NavigationContainer>
    )
}

export default Router
