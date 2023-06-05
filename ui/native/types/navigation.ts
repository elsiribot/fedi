import { DrawerNavigationProp } from '@react-navigation/drawer'
import { LinkingOptions, RouteProp } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { Transaction } from '@fedi/common/types'

import { BtcLnUri, Group, Member, MSats, Site } from '.'

// This type declaration allows all instances of useNavigation
// to be aware of type-safety from RootStackParamsList
declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList {}
    }
}

export const DRAWER_NAVIGATION_ID: any = 'ConnectedFederationsDrawer'
export const MAIN_NAVIGATOR_ID: any = 'MainStackNavigator'
export const TABS_NAVIGATOR_ID: any = 'TabsNavigator'

export type RouteHook = RouteProp<RootStackParamList>
export type DrawerNavigationHook =
    DrawerNavigationProp<MainNavigatorDrawerParamList>
export type NavigationHook = NativeStackNavigationProp<RootStackParamList>
export type NavigationLinkingConfig = LinkingOptions<
    RootStackParamList | MainNavigatorDrawerParamList
>
export type MainNavigatorDrawerParamList = {
    MainNavigator: undefined
    SwitchingFederations: { federationId: string | null }
}
export type TabsNavigatorParamList = {
    Chat: undefined
    Home: { offline: boolean }
    Settings: undefined
}
export type RootStackParamList = {
    AddBroadcastAdmin: { group: Group }
    BroadcastAdminsList: { group: Group }
    BitcoinRequest: { uri: string }
    ChatWallet: { recipient: Member }
    ChooseBackupMethod: undefined
    ChooseRecoveryMethod: undefined
    CompleteRecoveryAssist: { videoPath: string; recoveryId: string }
    CompleteSocialBackup: undefined
    CompleteSocialRecovery: undefined
    ConfirmReceiveOffline: { ecash: string; amount: MSats }
    ConfirmRecoveryAssist: undefined
    ConfirmSendLightning: { lightningUri: BtcLnUri }
    ConfirmSendOnChain: { bitcoinUri: BtcLnUri }
    ConnectedFederationsDrawer: undefined
    CreateGroup: undefined
    CreateUsername: undefined
    DirectChat: { member: Member }
    EditGroup: { group: Group }
    Eula: undefined
    FederationInvite: { inviteLink: string }
    FederationGreeting: undefined
    FederationWelcome: undefined
    FederationAcceptTerms: undefined
    Initializing: undefined
    JoinGroup: undefined
    MemberQrCode: undefined
    NewMessage: undefined
    PersonalBackupGuidance: undefined
    PersonalBackupSuccess: undefined
    PersonalRecovery: undefined
    PersonalRecoverySuccess: undefined
    PopupFederationEnded: undefined
    LocateSocialRecovery: undefined
    ReceiveSuccess: { tx: Transaction }
    Receive: undefined
    ReceiveOffline: undefined
    RecoveryWords: undefined
    RecoveryAssistSuccess: undefined
    RecordBackupVideo: undefined
    GroupChat: { group: Group }
    GroupAdmin: { group: Group }
    GroupInvite: { group: Group }
    ScanFederationCode: undefined
    ScanMemberCode: undefined
    ScanSocialRecoveryCode: undefined
    SelectRecoveryFileSuccess: { fileName: string }
    SelectRecoveryFileFailure: { fileName: string }
    Send: undefined
    SendOfflineAmount: undefined
    SendOfflineQr: { ecash: string; amount: MSats }
    SendSuccess: { amount: MSats; unit: string }
    SitesBrowser: { site: Site }
    Splash: undefined
    StartPersonalBackup: undefined
    StartRecoveryAssist: undefined
    StartSocialBackup: undefined
    SocialBackupCloudUpload: undefined
    SocialBackupGuidance: undefined
    SocialBackupProcessing: { videoFilePath: string }
    SocialBackupSuccess: undefined
    SocialRecoveryQrModal: undefined
    SocialRecoverySuccess: undefined
    SocialRecoveryFailure: undefined
    TabsNavigator: undefined
    Transactions: undefined
    DeveloperSettings: undefined
}
