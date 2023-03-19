import { xml } from '@xmpp/client'
import { useCallback } from 'react'

import {
    ArchiveQueryFilters,
    ArchiveQueryPagination,
    Group,
    Member,
    Message,
} from '../../types'
import { Keypair } from '../../types/chat'
import { useChatContext } from '../contexts/ChatContext'
import {
    addMemberToRoster,
    changeMucRoomName,
    enterMucRoom,
    fetchMessagesFromArchive,
    fetchMucRoomConfig,
    fetchRoster,
    getPublicKeyFor,
    getUniqueGroupId,
    sendDirectMessage,
    sendGroupMessage,
    sendUpdatePaymentMessage,
} from '../operations/chat'

// This is a React hook providing the full set of functions that use the
// xmppClient to perform chat operations
export const useXmpp = () => {
    const { state, dispatch } = useChatContext()
    const { xmppClient } = state

    return {
        addMemberToRoster: useCallback(
            (member: Member): Promise<Member> => {
                return addMemberToRoster(member, xmppClient)
            },
            [xmppClient],
        ),
        changeMucRoomName: useCallback(
            (group: Group, updatedName: string): Promise<boolean> => {
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
            (group: Group): Promise<string> => {
                return fetchMucRoomConfig(group, xmppClient)
            },
            [xmppClient],
        ),
        fetchMessagesFromArchive: useCallback(
            (
                filters: ArchiveQueryFilters | null,
                pagination: ArchiveQueryPagination | null,
            ): Promise<null> => {
                return fetchMessagesFromArchive(
                    filters,
                    pagination,
                    dispatch,
                    xmppClient,
                )
            },
            [dispatch, xmppClient],
        ),
        fetchRoster: useCallback((): Promise<boolean> => {
            return fetchRoster(dispatch, xmppClient)
        }, [dispatch, xmppClient]),
        getPublicKeyFor: useCallback(
            (member: Member): Promise<boolean> => {
                return getPublicKeyFor(member, xmppClient)
            },
            [xmppClient],
        ),
        getUniqueGroupId: useCallback((): Promise<string> => {
            return getUniqueGroupId(xmppClient)
        }, [xmppClient]),
        enterMucRoom: useCallback(
            (group: Group): Promise<Group> => {
                return enterMucRoom(group, xmppClient)
            },
            [xmppClient],
        ),
        sendDirectMessage: useCallback(
            (
                to: Member,
                message: Message,
                withEncryptionKeys?: Keypair,
            ): Promise<void> => {
                return sendDirectMessage(
                    to,
                    message,
                    xmppClient,
                    withEncryptionKeys,
                )
            },
            [xmppClient],
        ),
        sendGroupMessage: useCallback(
            (to: Group, message: Message): Promise<void> => {
                return sendGroupMessage(to, message, xmppClient)
            },
            [xmppClient],
        ),
        sendUpdatePaymentMessage: useCallback(
            (to: Member, message: Message): Promise<void> => {
                return sendUpdatePaymentMessage(to, message, xmppClient)
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
