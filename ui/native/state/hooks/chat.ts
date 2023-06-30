import { xml } from '@xmpp/client'
import { useCallback } from 'react'

import { ChatMember, Key, Keypair } from '@fedi/common/types'
import { XmppMemberRole } from '@fedi/common/utils/XmlUtils'

import {
    ArchiveQueryFilters,
    ArchiveQueryPagination,
    Group,
    Member,
    Message,
} from '../../types'
import {
    mergeMembersSeen,
    updateGroup,
    useChatContext,
} from '../contexts/ChatContext'
import {
    addAdminToGroup,
    addMemberToRoster,
    changeMucRoomName,
    enterMucRoom,
    fetchGroupMembersList,
    fetchMessagesFromArchive,
    fetchMucRoomConfig,
    fetchRoster,
    getPublicKeyFor,
    getUniqueGroupId,
    publishPublicKey,
    removeAdminFromGroup,
    sendDirectMessage,
    sendGroupMessage,
} from '../operations/chat'

// This is a React hook providing the full set of functions that use the
// xmppClient to perform chat operations
export const useXmpp = () => {
    const { state, dispatch } = useChatContext()
    const { membersSeen, xmppClient } = state

    return {
        addAdminToGroup: useCallback(
            (member: Member, group: Group): Promise<Member> => {
                return addAdminToGroup(member, group, xmppClient)
            },
            [xmppClient],
        ),
        addMemberToRoster: useCallback(
            (member: Member): Promise<Member> => {
                return addMemberToRoster(member, xmppClient)
            },
            [xmppClient],
        ),
        changeMucRoomName: useCallback(
            (group: Group, updatedName: string): Promise<void> => {
                return changeMucRoomName(group, updatedName, xmppClient).then(
                    res => dispatch(updateGroup(res)),
                )
            },
            [dispatch, xmppClient],
        ),
        fetchGroupMembersList: useCallback(
            (group: Group, role: XmppMemberRole): Promise<ChatMember[]> => {
                return fetchGroupMembersList(group, role, xmppClient)
            },
            [xmppClient],
        ),
        fetchMucRoomConfig: useCallback(
            (group: Group): Promise<Group> => {
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
        fetchRoster: useCallback((): Promise<void> => {
            return fetchRoster(xmppClient).then(members => {
                dispatch(mergeMembersSeen(members))
            })
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
        publishPublicKey: useCallback(
            (pubkey: Key): Promise<boolean> => {
                return publishPublicKey(pubkey, xmppClient)
            },
            [xmppClient],
        ),
        removeAdminFromGroup: useCallback(
            (member: Member, group: Group): Promise<Member> => {
                return removeAdminFromGroup(member, group, xmppClient)
            },
            [xmppClient],
        ),
        sendDirectMessage: useCallback(
            (
                to: Member,
                message: Message,
                withEncryptionKeys?: Keypair,
                updatePayment?: boolean,
            ): Promise<void> => {
                // Make sure we always pass the member with a pubkey
                let toMember: Member | undefined = to
                if (!toMember.publicKeyHex) {
                    toMember = membersSeen.find(
                        m =>
                            m.username === toMember?.username && m.publicKeyHex,
                    )
                }
                if (toMember) {
                    return sendDirectMessage(
                        toMember,
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
