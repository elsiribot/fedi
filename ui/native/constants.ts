import i18n from './localization/i18n'
import { Group } from './types'

export * from '@fedi/common/constants/sites'
export * from '@fedi/common/constants/xmpp'
export * from '@fedi/common/constants/bip39'

/*
    -----
    General
    -----
*/

// Regtest feds
export const FEDERATION_ALPHA =
    '{"members":[[0,"wss://alpha.regtest.sirion.io"]]}'
export const FEDERATION_BRAVO =
    '{"members":[[0,"wss://bravo.regtest.sirion.io"]]}'
// Signet feds
export const FEDERATION_SIGNET =
    '{"members":[[0,"wss://fm-signet.sirion.io:443"]]}'

export const TEST_FEDERATION = FEDERATION_ALPHA

// Keys used for persisting state in local AsyncStorage
export const AUTHENTICATED_GUARDIAN_DB_KEY = 'AUTHENTICATED_GUARDIAN_DB_KEY'
export const ACTIVE_FEDERATION_ID_DB_KEY = 'ACTIVE_FEDERATION_ID_DB_KEY'
export const FEDERATION_USERNAME_ID_DB_KEY = 'FEDERATION_USERNAME_ID_DB_KEY'
export const CHAT_MEMBERS_PERSISTENCE_KEY = 'AsyncStorage-ChatContext-members'
export const CHAT_MESSAGES_PERSISTENCE_KEY = 'AsyncStorage-ChatContext-messages'
export const CHAT_GROUPS_PERSISTENCE_KEY = 'AsyncStorage-ChatContext-groups'

// Websocket URL for checking BTCUSD exchange rate
export const BITFINEX_BTCUSD_WEBSOCKET_URL = 'wss://api-pub.bitfinex.com/ws/2'

/*
    -----
    Chat
    -----
*/
export const DEFAULT_GROUP_NAME = i18n.t('feature.chat.new-group')
export const FEDI_GENERAL_CHANNEL_GROUP = new Group({
    id: 'fedi-community-group',
    icon: 'FediLogoIcon',
    name: i18n.t('feature.chat.fedi-community'),
    pinned: true,
    messagePreview: i18n.t('feature.chat.fedi-community-message-preview'),
})
export const FEDI_RECOVERY_SUPPORT_GROUP = new Group({
    id: 'fedi-recovery-support-group',
    icon: 'Cash',
    name: i18n.t('feature.chat.money-changing'),
    pinned: true,
    messagePreview: i18n.t('feature.chat.money-changing-message-preview'),
})
// This is the default role granted to a member entering a MUC room
// which determines their ability to send messages in a broadcast-only room
export const XMPP_MUC_ROLE_VISITOR = 'visitor'
