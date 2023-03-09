import { xml } from '@xmpp/client'
import { JID } from '@xmpp/jid'
import { Element } from 'ltx'
import { useCallback } from 'react'

import { DEFAULT_GROUP_NAME, XMPP_MUC_DOMAIN } from '../../constants'
import {
    ArchiveQueryFilters,
    ArchiveQueryPagination,
    Group,
    Member,
    OutgoingGroupMessage,
    OutgoingMessage,
} from '../../types'
import { addToGroups, useChatContext } from '../contexts/ChatContext'
import {
    addMemberToRoster,
    changeMucRoomName,
    fetchMessagesFromArchive,
    fetchMucRoomConfig,
    fetchRoster,
    getUniqueGroupId,
} from '../operations/chat'

export const useXmpp = () => {
    const { state, dispatch } = useChatContext()
    const { xmppClient } = state

    return {
        addMemberToRoster: useCallback(
            (member: Member) => {
                return addMemberToRoster(member, xmppClient)
            },
            [xmppClient],
        ),
        changeMucRoomName: useCallback(
            (group: Group, updatedName: string) => {
                return changeMucRoomName(
                    group,
                    updatedName,
                    dispatch,
                    xmppClient,
                )
            },
            [dispatch, xmppClient],
        ),
        fetchMucRoomConfig: useCallback(
            (group: Group) => {
                return fetchMucRoomConfig(group, xmppClient)
            },
            [xmppClient],
        ),
        fetchMessagesFromArchive: useCallback(
            (
                filters: ArchiveQueryFilters | null,
                pagination: ArchiveQueryPagination | null,
            ) => {
                return fetchMessagesFromArchive(
                    filters,
                    pagination,
                    dispatch,
                    xmppClient,
                )
            },
            [dispatch, xmppClient],
        ),
        fetchRoster: useCallback(() => {
            return fetchRoster(dispatch, xmppClient)
        }, [dispatch, xmppClient]),
        getUniqueGroupId: useCallback((): Promise<string> => {
            return getUniqueGroupId(xmppClient)
        }, [xmppClient]),
        // TODO: Refactor remaining functions to use operations/chat.ts
        // enterMucRoom: useCallback(
        //     (group: Group) => {
        //         return enterMucRoom(group, dispatch, xmppClient)
        //     },
        //     [dispatch, xmppClient],
        // ),
        enterMucRoom: useCallback(
            (group: Group) => {
                if (!xmppClient?.jid) return
                try {
                    const { local, domain, resource } = xmppClient?.jid as JID
                    const fromUser = `${local}@${domain}/${resource}`
                    const onStanzaReceived = async (stanza: Element) => {
                        // Receive a registration response from the server
                        if (
                            stanza.is('presence') &&
                            stanza.getAttr('id') === 'enter-muc-room'
                        ) {
                            const result = stanza.getChild('x')
                            const statusResults = result?.getChildren('status')

                            statusResults?.map(async sr => {
                                // status 201 = configuration required, send an room
                                // configuration query to allow others to join
                                // https://xmpp.org/extensions/xep-0045.html#createroom-reserved
                                if (sr?.getAttr('code') === '201') {
                                    const roomNameFieldXml = xml(
                                        'field',
                                        {
                                            var: 'muc#roomconfig_roomname',
                                        },
                                        xml(
                                            'value',
                                            {},
                                            group.name || DEFAULT_GROUP_NAME,
                                        ),
                                    )
                                    const persistenceFieldXml = xml(
                                        'field',
                                        {
                                            var: 'muc#roomconfig_persistentroom',
                                        },
                                        xml('value', {}, '1'),
                                    )
                                    const roomConfigQueryXml = xml(
                                        'query',
                                        {
                                            xmlns: 'http://jabber.org/protocol/muc#owner',
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
                                    xmppClient?.send(
                                        xml(
                                            'iq',
                                            {
                                                from: fromUser,
                                                to: `${group.id}@${XMPP_MUC_DOMAIN}`,
                                                id: 'create-muc-room',
                                                type: 'set',
                                            },
                                            roomConfigQueryXml,
                                        ),
                                    )
                                }
                                // status 110 = self-presence message which confirms
                                // occupancy in room to be added to context
                                if (sr?.getAttr('code') === '110') {
                                    xmppClient?.removeListener(
                                        'stanza',
                                        onStanzaReceived,
                                    )
                                    dispatch(addToGroups(group))
                                }
                            })
                        }
                    }
                    xmppClient?.on('stanza', onStanzaReceived)

                    // do we need to clean up listeners if dependencies change
                    // and this callback gets re-run? count listeners to monitor this
                    console.info(
                        'xmppClient has',
                        xmppClient?.listenerCount('stanza'),
                        'stanza listeners',
                    )
                    xmppClient?.send(
                        xml(
                            'presence',
                            {
                                from: fromUser,
                                to: `${group.id}@${XMPP_MUC_DOMAIN}/${local}`,
                                id: 'enter-muc-room',
                            },
                            xml('x', {
                                xmlns: 'http://jabber.org/protocol/muc',
                            }),
                        ),
                    )
                } catch (error) {
                    console.error('enterMucRoom error', error)
                }
            },
            [dispatch, xmppClient],
        ),
        sendUpdatedPaymentMessage: useCallback(
            ({ message, to }: OutgoingMessage) => {
                const fromJid = xmppClient?.jid?.toString()
                const toJid = to?.jid.toString()
                try {
                    xmppClient?.send(
                        xml(
                            'message',
                            {
                                id: message.id,
                                type: 'chat',
                                from: fromJid,
                                to: toJid,
                            },
                            xml(
                                'body',
                                { xmlns: 'jabber:client' },
                                message.content as string,
                            ),
                            xml(
                                'dm',
                                { xmlns: 'fedi:direct-message' },
                                JSON.stringify(message),
                            ),
                            xml('action', { xmlns: 'fedi:update-payment' }),
                        ),
                    )
                } catch (error) {
                    console.error('sendUpdatedPaymentMessage error', error)
                }
            },
            [xmppClient],
        ),
        sendDirectMessage: useCallback(
            ({ message, to }: OutgoingMessage) => {
                const fromJid = xmppClient?.jid?.toString()
                const toJid = to?.jid.toString()

                try {
                    xmppClient?.send(
                        xml(
                            'message',
                            {
                                id: message.id,
                                type: 'chat',
                                from: fromJid,
                                to: toJid,
                            },
                            xml(
                                'body',
                                { xmlns: 'jabber:client' },
                                message.content as string,
                            ),
                            xml(
                                'dm',
                                { xmlns: 'fedi:direct-message' },
                                JSON.stringify(message),
                            ),
                        ),
                    )
                } catch (error) {
                    console.error('sendDirectMessage error', error)
                }
            },
            [xmppClient],
        ),
        sendGroupMessage: useCallback(
            ({ message, toRoom }: OutgoingGroupMessage) => {
                const fromJid = xmppClient?.jid?.toString()
                const to = `${toRoom}@${XMPP_MUC_DOMAIN}`
                try {
                    xmppClient?.send(
                        xml(
                            'message',
                            {
                                id: message.id,
                                from: fromJid,
                                type: 'groupchat',
                                to,
                            },
                            xml(
                                'body',
                                { xmlns: 'jabber:client' },
                                message.content as string,
                            ),
                            xml(
                                'gm',
                                { xmlns: 'fedi:group-message' },
                                JSON.stringify(message),
                            ),
                        ),
                    )
                } catch (error) {
                    console.error('sendGroupMessage error', error)
                }
            },
            [xmppClient],
        ),
        sendTestXml: useCallback(() => {
            xmppClient?.send(
                xml(
                    'iq',
                    {
                        id: 'get-messages',
                        type: 'set',
                    },
                    xml('query', {
                        xmlns: 'urn:xmpp:mam:2',
                        queryid: 'q1',
                    }),
                ),
            )
        }, [xmppClient]),
    }
}
