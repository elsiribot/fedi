// The number of messages to return
export const XMPP_DEFAULT_PAGE_LIMIT = '20'

// The URL where the Prosody chat server is hosted
export const XMPP_DOMAIN = 'xmpp-02.dev.fedibtc.com'

// export const XMPP_DOMAIN = 'xmpp-01.dev.fedibtc.com'
// export const XMPP_DOMAIN = 'xmpp.dev.fedibtc.com'

// This is the XMPP Multi-User-Chat (MUC) domain defined
// in prosody.config.lua on the XMPP server
// https://prosody.im/doc/modules/mod_muc
export const XMPP_MUC_DOMAIN = 'muc.xmpp-02.dev.fedibtc.com'
// export const XMPP_MUC_DOMAIN = 'xmpp-01-groups.dev.fedibtc.com'
// export const XMPP_MUC_DOMAIN = 'xmpp-rooms.dev.fedibtc.com'

// The resource on the server designated for all chat operations...
// use cases for changing this are not clear so it is fixed for now
// https://xmpp.org/rfcs/rfc6120.html#bind
export const XMPP_RESOURCE = 'chat'

// We connect via websocket
export const XMPP_SERVICE = `wss://${XMPP_DOMAIN}/xmpp-websocket`

export const XMPP_CONNECTION_OPTIONS = {
    service: XMPP_SERVICE,
    resource: XMPP_RESOURCE,
} as const

// Different types of <message> stanzas expected from the XMPP server
// ex: <message type="chat">...</message>
export const XMPP_MESSAGE_TYPES = {
    GROUPCHAT: 'groupchat',
    CHAT: 'chat',
    HEADLINE: 'headline',
} as const
