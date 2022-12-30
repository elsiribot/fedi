import { ImageSourcePropType } from 'react-native'

interface ImagesMap {
    [key: string]: ImageSourcePropType
}

export const Images: ImagesMap = {
    AllowCameraAccessIcon: require('./allow-camera-access-icon.png'),
    Cash: require('./cash.png'),
    Cog: require('./cog.png'),
    Done: require('./done.png'),
    Error: require('./error.png'),
    Federation: require('./federation.png'),
    FederationXIconXs: require('./federationx-icon-xs.png'),
    FederationXIconSm: require('./federationx-icon-sm.png'),
    FediFile: require('./fedi-file.png'),
    FediLogo: require('./fedi-logo.png'),
    FediLogoIcon: require('./fedi-logo-icon.png'),
    Fedimint: require('./fedimint.png'),
    FediQrLogo: require('./fedi-qr-logo.png'),
    Globe: require('./globe.png'),
    HoloBackground: require('./holo-background.jpg'),
    InviteMembers: require('./invite-members.png'),
    LeaveFederation: require('./leave-federation.png'),
    Note: require('./note.png'),
    Offline: require('./offline.png'),
    Recovery: require('./recovery.png'),
    SocialPeople: require('./social-people.png'),
    SwitchLeft: require('./switch-left.png'),
    SwitchRight: require('./switch-right.png'),
    Wallet: require('./wallet.png'),
    WordList: require('./word-list.png'),
}
