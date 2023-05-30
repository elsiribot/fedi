// This file contains logic for preparing XML, sending XMPP stanzas
// to the chat server, and handling responses (if any)
import { Client, jid } from '@xmpp/client'
import XMPPError from '@xmpp/error'
import { Element } from 'ltx'

import { ChatMember, Key, Keypair } from '@fedi/common/types'
import xmlUtils, {
    AddToRosterQuery,
    EncryptedDirectChatMessage,
    EnterMucRoomPresence,
    GetMembersListQuery,
    GetMessagesQuery,
    GetPublicKeyQuery,
    GetRoomConfigQuery,
    GetRosterQuery,
    GroupChatMessage,
    PublishPublicKeyQuery,
    SetMemberRoleQuery,
    SetPubsubNodeConfigQuery,
    SetRoomConfigQuery,
    UniqueRoomNameQuery,
    XmppMemberRole,
} from '@fedi/common/utils/XmlUtils'

import {
    DEFAULT_GROUP_NAME,
    XMPP_MUC_ROLE_VISITOR,
    XMPP_RESOURCE,
} from '../../constants'
import i18n from '../../localization/i18n'
import {
    ArchiveQueryFilters,
    ArchiveQueryPagination,
    Group,
    Member,
    Message,
} from '../../types'
import {
    Action as ChatAction,
    changeLastFetchedMessageId,
} from '../contexts/ChatContext'

export const addAdminToGroup = (
    member: Member,
    group: Group,
    xmppClient: Client | null,
): Promise<Member> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient?.jid) return reject(i18n.t('errors.unknown-error'))

        try {
            const { iqCaller } = xmppClient! as Client
            const grantVoiceQueryXml = xmlUtils.buildQuery(
                new SetMemberRoleQuery({
                    from: xmppClient!.jid!.toString(),
                    to: `${group.id}@muc.${xmppClient.jid!.getDomain()}`,
                    username: member.username,
                    role: XmppMemberRole.participant,
                }),
            )
            await iqCaller.request(grantVoiceQueryXml)
            resolve(member)
        } catch (error: any) {
            console.error('addAdminToGroup', error)
            reject(i18n.t('errors.unknown-error'))
        }
    })
}

export const addMemberToRoster = (
    member: Member,
    xmppClient: Client | null,
): Promise<Member> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient?.jid) return reject(i18n.t('errors.unknown-error'))

        try {
            const { iqCaller } = xmppClient! as Client
            const roomConfigQueryXml = xmlUtils.buildQuery(
                new AddToRosterQuery({
                    newRosterItem: `${
                        member.username
                    }@${xmppClient.jid.getDomain()}`,
                    from: xmppClient!.jid!.toString(),
                }),
            )
            await iqCaller.request(roomConfigQueryXml)
        } catch (error: any) {
            console.error('addMemberToRoster', error)
            reject(i18n.t('errors.unknown-error'))
        }
    })
}

export const changeMucRoomName = (
    group: Group,
    updatedName: string,
    xmppClient: Client | null,
): Promise<Group> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient?.jid) return reject(i18n.t('errors.unknown-error'))

        try {
            const { iqCaller } = xmppClient! as Client
            const roomConfigQueryXml = xmlUtils.buildQuery(
                new SetRoomConfigQuery({
                    roomName: updatedName,
                    from: xmppClient!.jid!.toString(),
                    to: `${group.id}@muc.${xmppClient.jid.getDomain()}`,
                }),
            )
            await iqCaller.request(roomConfigQueryXml)
            const updatedGroup = new Group({
                ...group,
                name: updatedName,
            })
            resolve(updatedGroup)
        } catch (error: any) {
            console.error('changeMucRoomName', error)
            if (
                (error as XMPPError) &&
                error.name === 'StanzaError' &&
                error.type === 'auth' &&
                error.condition === 'forbidden'
            ) {
                reject(i18n.t('errors.only-group-owners-can-change-name'))
            } else {
                reject(i18n.t('errors.unknown-error'))
            }
        }
    })
}

export const fetchMessagesFromArchive = (
    filters: ArchiveQueryFilters | null,
    pagination: ArchiveQueryPagination | null,
    dispatch: React.Dispatch<ChatAction>,
    xmppClient: Client | null,
): Promise<null> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient || !xmppClient?.jid) {
            return reject(i18n.t('errors.unknown-error'))
        }

        try {
            const { iqCaller } = xmppClient! as Client
            const getMessagesQueryXml = xmlUtils.buildQuery(
                new GetMessagesQuery({
                    filters,
                    pagination,
                }),
            )
            // This result gives us the total message count and
            // handles pagination for queries to the message archive
            const result = await iqCaller.request(getMessagesQueryXml)
            console.debug('fetchMessagesFromArchive', result.toString())
            const results = result.getChild('fin')?.getChild('set')
            if (!results) return resolve(null)

            const lastMessageId = results.getChild('last')?.getText()
            if (!lastMessageId) return resolve(null)

            dispatch(changeLastFetchedMessageId(lastMessageId))
        } catch (error) {
            console.error('fetchMessagesFromArchive', error)
        }
    })
}

export const fetchRoster = (xmppClient: Client | null): Promise<Member[]> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient || !xmppClient?.jid)
            return reject(i18n.t('errors.unknown-error'))

        try {
            const { iqCaller } = xmppClient! as Client
            const roomConfigQueryXml = xmlUtils.buildQuery(
                new GetRosterQuery({
                    from: xmppClient!.jid!.toString(),
                }),
            )
            const result = await iqCaller.request(roomConfigQueryXml)
            console.debug('fetchRoster', result)
            let membersSeen: Member[] = []
            if (result.getChild('query')) {
                console.debug('query', result.getChild('query'))
                const rosterMembers = result
                    .getChild('query')
                    ?.getChildren('item')
                console.debug('rosterMembers', rosterMembers)

                membersSeen = rosterMembers!.map(rm => {
                    return new Member({
                        jid: jid(rm.getAttr('jid')),
                    })
                })

                console.debug('membersSeen', membersSeen)

                resolve(membersSeen)
            }
        } catch (error) {
            console.error('fetchRoster', error)
        }
    })
}

export const fetchGroupMembersList = (
    group: Group,
    role: XmppMemberRole,
    xmppClient: Client | null,
): Promise<ChatMember[]> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient || !xmppClient?.jid)
            return reject(i18n.t('errors.unknown-error'))

        try {
            const { iqCaller } = xmppClient! as Client
            const membersListQueryXml = xmlUtils.buildQuery(
                new GetMembersListQuery({
                    from: xmppClient!.jid!.toString(),
                    to: `${group.id}@muc.${xmppClient.jid!.getDomain()}`,
                    role,
                }),
            )
            const result = await iqCaller.request(membersListQueryXml)
            console.info('fetchGroupMembersList', result)
            if (result.getChild('query')) {
                const memberItems = result
                    .getChild('query')
                    ?.getChildren('item')
                if (!memberItems || memberItems.length === 0) return resolve([])

                const members = memberItems.map(i => {
                    const username: string = i.getAttr('nick')
                    const jid: string = i.getAttr('jid')
                    const id: string = jid.split(`/${XMPP_RESOURCE}`)[0]
                    return {
                        id,
                        username,
                    } as ChatMember
                })
                resolve(members)
            }
        } catch (error) {
            console.error('fetchGroupMembersList', error)
            reject(i18n.t('errors.unknown-error'))
        }
    })
}

export const fetchMucRoomConfig = (
    group: Group,
    xmppClient: Client | null,
): Promise<Group> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient || !xmppClient?.jid)
            return reject(i18n.t('errors.unknown-error'))

        try {
            const { iqCaller } = xmppClient! as Client
            const roomConfigQueryXml = xmlUtils.buildQuery(
                new GetRoomConfigQuery({
                    from: xmppClient!.jid!.toString(),
                    to: `${group.id}@muc.${xmppClient.jid!.getDomain()}`,
                }),
            )
            const result = await iqCaller.request(roomConfigQueryXml)
            console.info('fetchMucRoomConfig', result)
            if (result.getChild('query')) {
                const fields = result.getChild('query')?.getChild('x')
                const groupName = fields
                    ?.getChildByAttr('var', 'muc#roomconfig_roomname')
                    ?.getChildText('value')
                const features = result
                    .getChild('query')
                    ?.getChildren('feature')

                const moderated = features?.find(
                    f => f.getAttr('var') === 'muc_moderated',
                )

                resolve({
                    ...group,
                    name: groupName || DEFAULT_GROUP_NAME,
                    broadcastOnly: moderated !== undefined,
                })
            }
        } catch (error) {
            console.error('fetchMucRoomConfig', error)
            reject(i18n.t('errors.unknown-error'))
        }
    })
}

export const getPublicKeyFor = (
    member: Member,
    xmppClient: Client | null,
): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient?.jid) return reject(i18n.t('errors.unknown-error'))

        try {
            const { iqCaller } = xmppClient! as Client
            const getPubkeyQueryXml = xmlUtils.buildQuery(
                new GetPublicKeyQuery({
                    from: xmppClient!.jid!.toString(),
                    to: member.jid.toString(),
                }),
            )
            const result = await iqCaller.request(getPubkeyQueryXml)
            console.debug('getPublicKeyFor', result.toString())
            resolve(true)
        } catch (error: any) {
            console.error('getPublicKeyFor', error)
            reject(i18n.t('errors.unknown-error'))
        }
    })
}

export const getUniqueGroupId = (
    xmppClient: Client | null,
): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient || !xmppClient?.jid)
            return reject(i18n.t('errors.unknown-error'))

        try {
            const { iqCaller } = xmppClient! as Client
            const uniqeRoomNameXml = xmlUtils.buildQuery(
                new UniqueRoomNameQuery({
                    to: `muc.${xmppClient.jid.getDomain()}`,
                }),
            )
            const response = await iqCaller.request(uniqeRoomNameXml)
            const roomName = response.getChildText('unique') as string

            resolve(roomName)
        } catch (error: any) {
            console.error('getUniqueGroupId', error)
        }
    })
}

export const enterMucRoom = (
    group: Group,
    xmppClient: Client | null,
): Promise<Group> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient || !xmppClient?.jid)
            return reject(i18n.t('errors.unknown-error'))

        try {
            const fromUser = xmppClient!.jid!.toString()
            const toGroup = `${group.id}@muc.${xmppClient.jid!.getDomain()}`

            const enterMucRoomPresence = xmlUtils.buildPresence(
                new EnterMucRoomPresence({
                    from: fromUser,
                    toGroup,
                }),
            )
            const onStanzaReceived = async (stanza: Element) => {
                // Receive a registration response from the server
                if (
                    stanza.is('presence') &&
                    stanza.getAttr('id').includes(EnterMucRoomPresence.id)
                ) {
                    const result = stanza.getChild('x')
                    const statusResults = result?.getChildren('status')

                    statusResults?.map(async sr => {
                        // status 201 = configuration required, send a room
                        // configuration query to allow others to join
                        // https://xmpp.org/extensions/xep-0045.html#createroom-reserved
                        if (sr?.getAttr('code') === '201') {
                            console.info('Received room configuration required')
                            const { iqCaller } = xmppClient! as Client
                            const roomConfigQueryXml = xmlUtils.buildQuery(
                                new SetRoomConfigQuery({
                                    roomName: group.name || DEFAULT_GROUP_NAME,
                                    moderatedRoom: group.broadcastOnly || false,
                                    from: fromUser,
                                    to: `${
                                        group.id
                                    }@muc.${xmppClient.jid!.getDomain()}`,
                                }),
                            )
                            console.info('Sending config for new group')
                            iqCaller.request(roomConfigQueryXml)
                        }
                        // status 110 = self-presence message which confirms
                        // occupancy in room to be added to context
                        if (sr?.getAttr('code') === '110') {
                            xmppClient?.removeListener(
                                'stanza',
                                onStanzaReceived,
                            )

                            // Expected roles:
                            //  Group creators always have a role = 'owner'
                            //  Open/unmoderated groups:
                            //      default role = 'participant'
                            //  Broadcast-only groups:
                            //      default role = 'visitor'
                            // Visitors cannot send messages in the group
                            const role = result
                                ?.getChild('item')
                                ?.getAttr('role')

                            resolve(
                                new Group({
                                    ...group,
                                    // TODO: refactor this out to a group-role map in redux
                                    myRole: role || XMPP_MUC_ROLE_VISITOR,
                                }),
                            )
                        }
                    })
                }
            }
            xmppClient?.on('stanza', onStanzaReceived)
            xmppClient?.send(enterMucRoomPresence)
        } catch (error) {
            console.error('enterMucRoom', error)
            reject(i18n.t('errors.unknown-error'))
        }
    })
}

export const publishPublicKey = (
    pubkey: Key,
    xmppClient: Client | null,
): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient?.jid) return reject(i18n.t('errors.unknown-error'))
        console.info('pubkey', pubkey.hex)

        try {
            const { iqCaller } = xmppClient! as Client
            const publishPubkeyQueryXml = xmlUtils.buildQuery(
                new PublishPublicKeyQuery({
                    pubkey: pubkey.hex,
                    from: xmppClient!.jid!.toString(),
                }),
            )
            const result = await iqCaller.request(publishPubkeyQueryXml)
            console.info('publishPublicKey', result)
            const setPubsubNodeConfigQueryXml = xmlUtils.buildQuery(
                new SetPubsubNodeConfigQuery({
                    from: xmppClient!.jid!.toString(),
                }),
            )
            await iqCaller.request(setPubsubNodeConfigQueryXml)
            resolve(true)
        } catch (error: any) {
            console.error('publishPublicKey', error)
            reject(i18n.t('errors.unknown-error'))
        }
    })
}

export const removeAdminFromGroup = (
    member: Member,
    group: Group,
    xmppClient: Client | null,
): Promise<Member> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient?.jid) return reject(i18n.t('errors.unknown-error'))

        try {
            const { iqCaller } = xmppClient! as Client
            const revokeVoiceQueryXml = xmlUtils.buildQuery(
                new SetMemberRoleQuery({
                    from: xmppClient!.jid!.toString(),
                    to: `${group.id}@muc.${xmppClient.jid!.getDomain()}`,
                    username: member.username,
                    role: XmppMemberRole.visitor,
                }),
            )
            await iqCaller.request(revokeVoiceQueryXml)
            resolve(member)
        } catch (error: any) {
            console.error('removeAdminFromGroup', error)
            reject(i18n.t('errors.unknown-error'))
        }
    })
}
export const sendDirectMessage = (
    to: Member,
    message: Message,
    xmppClient: Client | null,
    withEncryptionKeys?: Keypair,
    updatePayment?: boolean,
): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient || !xmppClient?.jid)
            return reject(i18n.t('errors.unknown-error'))

        try {
            const fromJid = xmppClient!.jid?.toString()
            const toJid = to.jid.toString()

            const encrypedDirectChatMessageXml = xmlUtils.buildMessage(
                new EncryptedDirectChatMessage({
                    from: fromJid,
                    to: toJid,
                    message,
                    senderKeys: withEncryptionKeys as Keypair,
                    recipientPublicKey: { hex: to.publicKeyHex as string },
                    updatePayment,
                }),
            )
            xmppClient!.send(encrypedDirectChatMessageXml)
        } catch (error) {
            console.error('sendDirectMessage', error)
            reject(i18n.t('errors.unknown-error'))
        }
    })
}

export const sendGroupMessage = (
    to: Group,
    message: Message,
    xmppClient: Client | null,
): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient || !xmppClient?.jid)
            return reject(i18n.t('errors.unknown-error'))

        try {
            const fromJid = xmppClient!.jid?.toString()
            const toGroup = `${to.id}@muc.${xmppClient.jid!.getDomain()}`

            const groupChatMessageXml = xmlUtils.buildMessage(
                new GroupChatMessage({
                    from: fromJid,
                    to: toGroup,
                    message,
                }),
            )
            xmppClient!.send(groupChatMessageXml)
        } catch (error) {
            console.error('sendDirectMessage', error)
            reject(i18n.t('errors.unknown-error'))
        }
    })
}
