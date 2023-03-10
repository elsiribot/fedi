import { jid, xml } from '@xmpp/client'
import { JID } from '@xmpp/jid'
import { Element } from 'ltx'
import uuid from 'react-native-uuid'

import { XMPP_DEFAULT_PAGE_LIMIT, XMPP_MUC_DOMAIN } from '../constants'
import {
    ArchiveQueryFilters,
    ArchiveQueryPagination,
    Group,
    Message,
} from '../types'

interface CommonXmppAttributes {
    from?: string
    to?: string
}

type XmppArgs =
    | AddToRosterArgs
    | GetMessagesArgs
    | GetRoomConfigArgs
    | SetRoomConfigArgs
    | GetRosterArgs
    | EnterMucRoomArgs
    | DirectChatArgs
    | GroupChatArgs

class XmppStanza {
    tag: string
    name: string
    args?: XmppArgs
    build: () => Element
}
class XmppMessage extends XmppStanza {
    tag = 'message'
}
class XmppPresence extends XmppStanza {
    tag = 'presence'
}
class XmppQuery extends XmppStanza {
    tag = 'iq'
}

// XMPP Message stanzas
// XML with a top-level <message> tag
interface DirectChatArgs extends CommonXmppAttributes {
    message: Message
}
export class DirectChatMessage extends XmppMessage {
    name = 'sendDirectChat'
    args: DirectChatArgs
    constructor(args: DirectChatArgs) {
        super()
        this.args = args
    }
    build = (): Element => {
        const { from, to, message } = this.args

        const attributes = {
            id: message.id,
            type: 'chat',
            from,
            to,
        }

        const bodyXml = xml(
            'body',
            { xmlns: 'jabber:client' },
            message.content as string,
        )

        const dmXml = xml(
            'dm',
            { xmlns: 'fedi:direct-message' },
            JSON.stringify(message),
        )

        return xml(this.tag, attributes, bodyXml, dmXml)
    }
}
interface GroupChatArgs extends CommonXmppAttributes {
    message: Message
    toGroup: Group
}
export class GroupChatMessage extends XmppMessage {
    name = 'sendGroupChat'
    args: GroupChatArgs
    constructor(args: GroupChatArgs) {
        super()
        this.args = args
    }
    build = (): Element => {
        const { from, toGroup, message } = this.args
        const to = `${toGroup.id}@${XMPP_MUC_DOMAIN}`

        const attributes = {
            id: message.id,
            type: 'groupchat',
            from,
            to,
        }

        const bodyXml = xml(
            'body',
            { xmlns: 'jabber:client' },
            message.content as string,
        )

        const gmXml = xml(
            'gm',
            { xmlns: 'fedi:group-message' },
            JSON.stringify(message),
        )

        return xml(this.tag, attributes, bodyXml, gmXml)
    }
}
interface UpdatePaymentArgs extends CommonXmppAttributes {
    message: Message
}
export class UpdatePaymentMessage extends XmppMessage {
    name = 'sendUpdatePayment'
    args: UpdatePaymentArgs
    constructor(args: UpdatePaymentArgs) {
        super()
        this.args = args
    }
    build = (): Element => {
        const { from, to, message } = this.args

        const attributes = {
            id: message.id,
            type: 'chat',
            from,
            to,
        }

        const bodyXml = xml(
            'body',
            { xmlns: 'jabber:client' },
            message.content as string,
        )

        const dmXml = xml(
            'dm',
            { xmlns: 'fedi:direct-message' },
            JSON.stringify(message),
        )

        const actionXml = xml('action', { xmlns: 'fedi:update-payment' })

        return xml(this.tag, attributes, bodyXml, dmXml, actionXml)
    }
}

// XMPP Presence stanzas
// XML with a top-level <presence> tag
export interface EnterMucRoomArgs extends CommonXmppAttributes {
    groupId: string
}
export class EnterMucRoomPresence extends XmppPresence {
    name = 'enterMucRoom'
    args: EnterMucRoomArgs
    constructor(args: EnterMucRoomArgs) {
        super()
        this.args = args
    }
    build = (): Element => {
        const { from, groupId } = this.args
        const fromJid: JID = jid(from!)
        const memberNickname = fromJid.local
        const attributes = {
            from,
            to: `${groupId}@${XMPP_MUC_DOMAIN}/${memberNickname}`,
            id: 'enter-muc-room',
        }

        return xml(
            this.tag,
            attributes,
            xml('x', {
                xmlns: 'http://jabber.org/protocol/muc',
            }),
        )
    }
}

// XMPP Query stanzas
// XML with a top-level <iq> tag
interface AddToRosterArgs extends CommonXmppAttributes {
    newRosterItem: string
}
type GetMessagesArgs = {
    filters?: ArchiveQueryFilters | null
    pagination?: ArchiveQueryPagination | null
}
type GetRoomConfigArgs = CommonXmppAttributes
type GetRosterArgs = CommonXmppAttributes
interface SetRoomConfigArgs extends CommonXmppAttributes {
    roomName: string
}
export class AddToRosterQuery extends XmppQuery {
    name = 'addToRoster'
    args: AddToRosterArgs
    constructor(args: AddToRosterArgs) {
        super()
        this.args = args
    }
    build = (): Element => {
        const { from, newRosterItem } = this.args

        const attributes = {
            id: `add-to-roster-${uuid.v4()}`,
            from,
            type: 'set',
        }

        const queryBodyXml = xml(
            'query',
            {
                xmlns: 'jabber:iq:roster',
            },
            xml('item', {
                jid: newRosterItem,
            }),
        )

        return xml(this.tag, attributes, queryBodyXml)
    }
}
export class GetMessagesQuery extends XmppQuery {
    name = 'getMessages'
    args: GetMessagesArgs
    constructor(args: GetMessagesArgs) {
        super()
        this.args = args
    }
    build = (): Element => {
        const { filters, pagination } = this.args

        const attributes = {
            id: `get-messages-${uuid.v4()}`,
            type: 'set',
        }

        const filterQuery = filters?.withJid
            ? xml(
                  'x',
                  {
                      xmlns: 'jabber:x:data',
                      type: 'submit',
                  },
                  xml(
                      'field',
                      { var: 'FORM_TYPE', type: 'hidden' },
                      xml('value', {}, 'urn:xmpp:mam:2'),
                  ),
                  xml(
                      'field',
                      { var: 'with' },
                      xml('value', {}, filters.withJid),
                  ),
              )
            : xml('x')

        const paginationQuery = pagination?.after
            ? xml(
                  'set',
                  { xmlns: 'http://jabber.org/protocol/rsm' },
                  xml('max', {}, pagination?.limit || XMPP_DEFAULT_PAGE_LIMIT),
                  xml('after', {}, pagination?.after),
              )
            : xml(
                  'set',
                  { xmlns: 'http://jabber.org/protocol/rsm' },
                  xml('max', {}, pagination?.limit || XMPP_DEFAULT_PAGE_LIMIT),
              )

        return xml(
            this.tag,
            attributes,
            xml(
                'query',
                {
                    xmlns: 'urn:xmpp:mam:2',
                    queryid: 'get-messages',
                },
                filterQuery,
                paginationQuery,
            ),
        )
    }
}
export class GetRoomConfigQuery extends XmppQuery {
    name = 'getRoomConfig'
    args: GetRoomConfigArgs
    constructor(args: GetRoomConfigArgs) {
        super()
        this.args = args
    }
    build = (): Element => {
        const { from, to } = this.args

        const attributes = {
            id: `get-room-config-${uuid.v4()}`,
            from,
            to,
            type: 'get',
        }

        const queryBodyXml = xml('query', {
            xmlns: 'http://jabber.org/protocol/disco#info',
            queryid: 'get-room-config-query',
        })

        return xml(this.tag, attributes, queryBodyXml)
    }
}
export class GetRosterQuery extends XmppQuery {
    name = 'getRoster'
    args: GetRosterArgs
    constructor(args: GetRosterArgs) {
        super()
        this.args = args
    }
    build = (): Element => {
        const { from } = this.args

        const attributes = {
            id: `get-roster-${uuid.v4()}`,
            from,
            type: 'get',
        }

        const queryBodyXml = xml('query', {
            xmlns: 'jabber:iq:roster',
        })
        return xml(this.tag, attributes, queryBodyXml)
    }
}
export class SetRoomConfigQuery extends XmppQuery {
    name = 'setRoomConfig'
    args: SetRoomConfigArgs
    constructor(args: SetRoomConfigArgs) {
        super()
        this.args = args
    }
    build = (): Element => {
        const { roomName, from, to } = this.args

        const attributes = {
            id: `set-room-config-${uuid.v4()}`,
            from,
            to,
            type: 'set',
        }

        const roomNameFieldXml = xml(
            'field',
            {
                var: 'muc#roomconfig_roomname',
            },
            xml('value', {}, roomName),
        )
        // When sending a new configuration for this room we make
        // sure the room remains persistent
        const persistenceFieldXml = xml(
            'field',
            {
                var: 'muc#roomconfig_persistentroom',
            },
            xml('value', {}, '1'),
        )

        const queryBodyXml = xml(
            'query',
            {
                xmlns: 'http://jabber.org/protocol/muc#owner',
                queryid: 'set-room-config-query',
            },
            xml(
                'x',
                {
                    xmlns: 'jabber:x:data',
                    type: 'submit',
                },
                xml(
                    'field',
                    { var: 'FORM_TYPE' },
                    xml(
                        'value',
                        {},
                        'http://jabber.org/protocol/muc#roomconfig',
                    ),
                ),
                roomNameFieldXml,
                persistenceFieldXml,
            ),
        )

        return xml(this.tag, attributes, queryBodyXml)
    }
}
export class UniqueRoomNameQuery extends XmppQuery {
    name = 'uniqueRoomName'
    build = (): Element => {
        const attributes = {
            type: 'get',
            to: XMPP_MUC_DOMAIN,
            id: `get-unique-room-name-${uuid.v4()}`,
        }

        return xml(
            this.tag,
            attributes,
            xml('unique', {
                xmlns: 'http://jabber.org/protocol/muc#unique',
            }),
        )
    }
}

class XmlUtils {
    buildPresence(presence: XmppPresence): Element {
        console.debug(
            'buildPresence',
            'name:',
            presence.name,
            'args:',
            presence.args,
        )
        return presence.build()
    }
    buildQuery(query: XmppQuery): Element {
        console.debug('buildQuery', 'name:', query.name, 'args:', query.args)
        return query.build()
    }
    buildMessage(message: XmppMessage): Element {
        console.debug(
            'buildMessage',
            'name:',
            message.name,
            'args:',
            message.args,
        )
        return message.build()
    }
}

const xmlUtils = new XmlUtils()
export default xmlUtils
