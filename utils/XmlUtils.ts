import { jid, xml } from '@xmpp/client'
import { JID } from '@xmpp/jid'
import { Element } from 'ltx'
import uuid from 'react-native-uuid'

import { XMPP_DEFAULT_PAGE_LIMIT, XMPP_MUC_DOMAIN } from '../constants'
import { ArchiveQueryFilters, ArchiveQueryPagination } from '../types'

interface CommonXmppAttributes {
    from?: string
    to?: string
}
export interface AddToRosterArgs extends CommonXmppAttributes {
    newRosterItem: string
}
export type GetMessagesArgs = {
    filters?: ArchiveQueryFilters | null
    pagination?: ArchiveQueryPagination | null
}
export type GetRoomConfigArgs = CommonXmppAttributes
export type GetRosterArgs = CommonXmppAttributes
export interface SetRoomConfigArgs extends CommonXmppAttributes {
    roomName: string
}
export interface EnterMucRoomArgs extends CommonXmppAttributes {
    groupId: string
}

type XmppArgs =
    | AddToRosterArgs
    | GetMessagesArgs
    | GetRoomConfigArgs
    | SetRoomConfigArgs
    | GetRosterArgs
    | EnterMucRoomArgs

class XmppStanza {
    tag: string
    name: string
    args?: XmppArgs
    build: () => Element
}

class XmppQuery extends XmppStanza {
    tag = 'iq'
}

class XmppPresence extends XmppStanza {
    tag = 'presence'
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

        const queryBodyXml = xml(
            'query',
            {
                xmlns: 'jabber:iq:roster',
            },
            xml('item', {
                jid: newRosterItem,
            }),
        )

        const attributes = {
            id: `add-to-roster-${uuid.v4()}`,
            from,
            type: 'set',
        }

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

        const attributes = {
            id: `get-messages-${uuid.v4()}`,
            type: 'set',
        }

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

        const queryBodyXml = xml('query', {
            xmlns: 'http://jabber.org/protocol/disco#info',
            queryid: 'get-room-config-query',
        })

        const attributes = {
            id: `get-room-config-${uuid.v4()}`,
            from,
            to,
            type: 'get',
        }

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

        const queryBodyXml = xml('query', {
            xmlns: 'jabber:iq:roster',
        })

        const attributes = {
            id: `get-roster-${uuid.v4()}`,
            from,
            type: 'get',
        }
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

        const attributes = {
            id: `set-room-config-${uuid.v4()}`,
            from,
            to,
            type: 'set',
        }

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

class XmlUtils {
    buildQuery(query: XmppQuery): Element {
        console.debug('buildQuery', 'name:', query.name, 'args:', query.args)
        return query.build()
    }
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
}

const xmlUtils = new XmlUtils()
export default xmlUtils
