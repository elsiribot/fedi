import { xml } from '@xmpp/client'
import { useCallback } from 'react'

import { selectAllChatMembers } from '@fedi/common/redux'
import { ChatMember, Key, Keypair, XmppChatMember } from '@fedi/common/types'

import { useAppSelector } from '.'
import {
    ArchiveQueryFilters,
    ArchiveQueryPagination,
    Group,
    Message,
} from '../../types'
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
    publishPublicKey,
    sendDirectMessage,
    sendGroupMessage,
} from '../operations/chat'

// This is a React hook providing the full set of functions that use the
// xmppClient to perform chat operations
export const useXmpp = () => {
    const { xmppClient } = useChatContext().state
    const membersSeen = useAppSelector(selectAllChatMembers)

    return {
        addMemberToRoster: useCallback(
            (member: XmppChatMember): Promise<XmppChatMember> => {
                return addMemberToRoster(member, xmppClient)
            },
            [xmppClient],
        ),
        changeMucRoomName: useCallback(
            (group: Group, updatedName: string): Promise<Group> => {
                return changeMucRoomName(group, updatedName, xmppClient)
            },
            [xmppClient],
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
            ): Promise<string | null> => {
                return fetchMessagesFromArchive(filters, pagination, xmppClient)
            },
            [xmppClient],
        ),
        fetchRoster: useCallback((): Promise<XmppChatMember[]> => {
            return fetchRoster(xmppClient)
        }, [xmppClient]),
        getPublicKeyFor: useCallback(
            (member: XmppChatMember): Promise<boolean> => {
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
        publishPublicKey: useCallback(
            (pubkey: Key): Promise<boolean> => {
                return publishPublicKey(pubkey, xmppClient)
            },
            [xmppClient],
        ),
        sendDirectMessage: useCallback(
            (
                to: XmppChatMember,
                message: Message,
                withEncryptionKeys?: Keypair,
                updatePayment?: boolean,
            ): Promise<void> => {
                // Make sure we always pass the member with a pubkey
                let toMember: XmppChatMember | undefined = to
                if (!toMember.publicKeyHex) {
                    toMember = (membersSeen as XmppChatMember[]).find(
                        m =>
                            m.username === toMember?.username && m.publicKeyHex,
                    )
                }
                if (toMember) {
                    return sendDirectMessage(
                        toMember as XmppChatMember,
                        message,
                        xmppClient,
                        withEncryptionKeys,
                        updatePayment,
                    )
                } else {
                    throw new Error(
                        'No public key found, failed to send message',
                    )
                }
            },
            [membersSeen, xmppClient],
        ),
        sendGroupMessage: useCallback(
            (to: Group, message: Message): Promise<void> => {
                return sendGroupMessage(to, message, xmppClient)
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
