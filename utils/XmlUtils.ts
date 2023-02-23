import { xml } from '@xmpp/client'
import { Element } from 'ltx'

class XmlUtils {
    generateRoomConfigQuery = (
        roomName: string,
        from: string,
        to: string,
    ): Element => {
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

        return xml(
            'iq',
            {
                id: 'set-room-config',
                from,
                to,
                type: 'set',
            },
            queryBodyXml,
        )
    }
}

const xmlUtils = new XmlUtils()
export default xmlUtils
