import { LinkingOptions } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { BtcLnUri, MSats, Site } from '.'
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

export type NavigationHook = NativeStackNavigationProp<RootStackParamList>
export type NavigationLinkingConfig = LinkingOptions<
    RootStackParamList | MainNavigatorDrawerParamList
>
export type MainNavigatorDrawerParamList = {
    MainNavigator: undefined
}
export type HomeTabsParamList = {
    Admin: undefined
    Wallet: { offline: boolean }
    Sites: undefined
}
export type RootStackParamList = {
    BitcoinRequest: { uri: string }
    ChooseBackupMethod: undefined
    ChooseRecoveryMethod: undefined
    CompleteSocialBackup: undefined
    CompleteSocialRecovery: undefined
    ConfirmSendLightning: { lightningUri: BtcLnUri }
    ConfirmSendOnChain: { bitcoinUri: BtcLnUri }
    ConfirmReceiveOffline: { ecash: string; amount: MSats }
    ConnectedFederationsDrawer: undefined
    FederationInvite: { inviteLink: string }
    Home: undefined
    Initializing: undefined
    PersonalBackupSuccess: undefined
    PersonalRecovery: undefined
    PersonalRecoverySuccess: undefined
    LocateSocialRecovery: undefined
    ReceiveSuccess: { tx: Transaction }
    Receive: undefined
    ReceiveOffline: undefined
    RecoveryWords: undefined
    RecoveryAssistConfirmation: undefined
    RecoveryAssistSuccess: undefined
    RecordBackupVideo: undefined
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
    SocialBackupProcessing: undefined
    SocialBackupSuccess: undefined
    SocialRecoveryQrModal: undefined
    SocialRecoverySuccess: undefined
    SocialRecoveryFailure: undefined
    Transactions: undefined
    SitesBrowser: { site: Site }
    DeveloperSettings: undefined
}
