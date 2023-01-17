import { ImageSourcePropType } from 'react-native'

interface ImagesMap {
    [key: string]: ImageSourcePropType
}

export const Images: ImagesMap = {
    AllowCameraAccessIcon: require('./allow-camera-access-icon.png'),
    Cash: require('./cash.png'),
    Cog: require('./cog.png'),
    Done: require('./done.png'),
    Edit: require('./edit.png'),
    Error: require('./error.png'),
    Federation: require('./federation.png'),
    // TODO: Refactor FederationXIcon sizes to use scalable SVGs
    FederationXIconXs: require('./federationx-icon-xs.png'),
    FederationXIconSm: require('./federationx-icon-sm.png'),
    FederationXIconLg: require('./federationx-icon-lg.png'),
    FediFile: require('./fedi-file.png'),
    FediLogo: require('./fedi-logo.png'),
    FediLogoIcon: require('./fedi-logo-icon.png'),
    Fedimint: require('./fedimint.png'),
    FediQrLogo: require('./fedi-qr-logo.png'),
    GoogleDrive: require('./google-drive.png'),
    Globe: require('./globe.png'),
    HoloBackground: require('./holo-background.jpg'),
    HoloBackgroundStrong: require('./holo-background-strong-900.png'),
    InviteMembers: require('./invite-members.png'),
    LeaveFederation: require('./leave-federation.png'),
    NewRoom: require('./new-room.png'),
    Note: require('./note.png'),
    Offline: require('./offline.png'),
    Phone: require('./phone.png'),
    Recovery: require('./recovery.png'),
    Search: require('./search.png'),
    SocialPeople: require('./social-people.png'),
    SwitchLeft: require('./switch-left.png'),
    SwitchRight: require('./switch-right.png'),
    Wallet: require('./wallet.png'),
    WordList: require('./word-list.png'),
    Video: require('./video.png'),
}

export const SiteImages: ImagesMap = {
    btcmap: require('./sites/btcmap.png'),
    bitrefill: require('./sites/bitrefill.png'),
    geyser: require('./sites/geyser.png'),
    ibex: require('./sites/ibex.png'),
    kollider: require('./sites/kollider.png'),
    lookingglass: require('./sites/lookingglass.png'),
    satscard: require('./sites/satscard.png'),
    stackernews: require('./sites/stackernews.png'),
    stakwork: require('./sites/stakwork.png'),
    wavlake: require('./sites/wavlake.png'),
}
