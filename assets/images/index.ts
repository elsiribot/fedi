import { ImageSourcePropType } from 'react-native'

interface ImagesMap {
    [key: string]: ImageSourcePropType
}

export const Images: ImagesMap = {
    AllowCameraAccessIcon: require('./allow-camera-access-icon.png'),
    Federation: require('./federation.png'),
    FederationXIconXs: require('./federationx-icon-xs.png'),
    FederationXIconSm: require('./federationx-icon-sm.png'),
    FediFile: require('./fedi-file.png'),
    FediLogo: require('./fedi-logo.png'),
    FediLogoIcon: require('./fedi-logo-icon.png'),
    FediQrLogo: require('./fedi-qr-logo.png'),
    HoloBackground: require('./holo-background.jpg'),
    InviteMembers: require('./invite-members.png'),
    LeaveFederation: require('./leave-federation.png'),
    Note: require('./note.png'),
    Offline: require('./offline.png'),
    Recovery: require('./recovery.png'),
    SocialPeople: require('./social-people.png'),
    Wallet: require('./wallet.png'),
    WordList: require('./word-list.png'),
}
