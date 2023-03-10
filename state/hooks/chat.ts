import { xml } from '@xmpp/client'
import { useCallback } from 'react'

import { XMPP_MUC_DOMAIN } from '../../constants'
import {
    ArchiveQueryFilters,
    ArchiveQueryPagination,
    Group,
    Member,
    OutgoingGroupMessage,
    OutgoingMessage,
} from '../../types'
import { useChatContext } from '../contexts/ChatContext'
import {
    addMemberToRoster,
    changeMucRoomName,
    enterMucRoom,
    fetchMessagesFromArchive,
    fetchMucRoomConfig,
    fetchRoster,
    getUniqueGroupId,
} from '../operations/chat'

// This is a React hook providing the full set of functions that use the
// xmppClient to perform chat operations
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
        enterMucRoom: useCallback(
            async (group: Group) => {
                return enterMucRoom(group, xmppClient)
            },
            [xmppClient],
        ),
        // TODO: Refactor remaining functions to use operations/chat.ts
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
        // For development purposes only
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
