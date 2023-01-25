import { LinkingOptions, RouteProp } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { BtcLnUri, Group, Member, MSats, Site } from '.'
import { Transaction } from '../bridge'

// This type declaration allows all instances of useNavigation
// to be aware of type-safety from RootStackParamsList
declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList {}
    }
}

export const DRAWER_NAVIGATION_ID: any = 'ConnectedFederationsDrawer'
export const MAIN_NAVIGATOR_ID: any = 'MainStackNavigator'

export type RouteHook = RouteProp<RootStackParamList>
export type NavigationHook = NativeStackNavigationProp<RootStackParamList>
export type NavigationLinkingConfig = LinkingOptions<
    RootStackParamList | MainNavigatorDrawerParamList
>
export type MainNavigatorDrawerParamList = {
    MainNavigator: undefined
}
export type SitesStackParamList = {
    SitesBrowser: { site: Site }
    SitesList: undefined
}
export type HomeTabsParamList = {
    Admin: undefined
    Community: undefined
    Sites: undefined
    Wallet: { offline: boolean }
}
export type RootStackParamList = {
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
    CreateUsername: undefined
    DirectChat: { member: Member }
    Eula: undefined
    FederationInvite: { inviteLink: string }
    FederationGreeting: undefined
    FederationWelcome: undefined
    Home: undefined
    Initializing: { reset: boolean }
    JoinGroup: undefined
    NewMessage: undefined
    PersonalBackupGuidance: undefined
    PersonalBackupSuccess: undefined
    PersonalRecovery: undefined
    PersonalRecoverySuccess: undefined
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
    ScanSocialRecoveryCode: undefined
    SelectRecoveryFileSuccess: { fileName: string }
    SelectRecoveryFileFailure: { fileName: string }
    Send: undefined
    SendOfflineAmount: undefined
    SendOfflineQr: { ecash: string; amount: MSats }
    SendSuccess: { amount: MSats; unit: string }
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
    Transactions: undefined
    DeveloperSettings: undefined
}
