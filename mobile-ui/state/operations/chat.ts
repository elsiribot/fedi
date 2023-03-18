// This file contains logic for preparing XML, sending XMPP stanzas
// to the chat server, and handling responses (if any)

import { Client, jid } from '@xmpp/client'
import XMPPError from '@xmpp/error'
import { Element } from 'ltx'

import {
    DEFAULT_GROUP_NAME,
    XMPP_DOMAIN,
    XMPP_MUC_DOMAIN,
} from '../../constants'
import i18n from '../../localization/i18n'
import {
    ArchiveQueryFilters,
    ArchiveQueryPagination,
    Group,
    Member,
    Message,
} from '../../types'
import { Key } from '../../types/chat'
import xmlUtils, {
    AddToRosterQuery,
    DirectChatMessage,
    EnterMucRoomPresence,
    GetMessagesQuery,
    GetPublicKeyQuery,
    GetRoomConfigQuery,
    GetRosterQuery,
    GroupChatMessage,
    PublishPublicKeyQuery,
    SetPubsubNodeConfigQuery,
    SetRoomConfigQuery,
    UniqueRoomNameQuery,
    UpdatePaymentMessage,
} from '../../utils/XmlUtils'
import {
    Action as ChatAction,
    changeLastFetchedMessageId,
    receiveMembersSeen,
    updateGroup,
} from '../contexts/ChatContext'

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
                    newRosterItem: `${member.username}@${XMPP_DOMAIN}`,
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
    dispatch: React.Dispatch<ChatAction>,
    xmppClient: Client | null,
): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient?.jid) return reject(i18n.t('errors.unknown-error'))

        try {
            const { iqCaller } = xmppClient! as Client
            const roomConfigQueryXml = xmlUtils.buildQuery(
                new SetRoomConfigQuery({
                    roomName: updatedName,
                    from: xmppClient!.jid!.toString(),
                    to: `${group.id}@${XMPP_MUC_DOMAIN}`,
                }),
            )
            await iqCaller.request(roomConfigQueryXml)
            const updatedGroup = new Group({
                ...group,
                name: updatedName,
            })
            dispatch(updateGroup(updatedGroup))
            resolve(true)
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
            console.log('fetchMessagesFromArchive', result)
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

export const fetchRoster = (
    dispatch: React.Dispatch<ChatAction>,
    xmppClient: Client | null,
): Promise<boolean> => {
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

                dispatch(receiveMembersSeen(membersSeen))
            }
        } catch (error) {
            console.error('fetchRoster', error)
        }
    })
}

export const fetchMucRoomConfig = (
    group: Group,
    xmppClient: Client | null,
): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient || !xmppClient?.jid)
            return reject(i18n.t('errors.unknown-error'))

        try {
            const { iqCaller } = xmppClient! as Client
            const roomConfigQueryXml = xmlUtils.buildQuery(
                new GetRoomConfigQuery({
                    from: xmppClient!.jid!.toString(),
                    to: `${group.id}@${XMPP_MUC_DOMAIN}`,
                }),
            )
            const result = await iqCaller.request(roomConfigQueryXml)
            console.info('fetchMucRoomConfig', result)
            if (result.getChild('query')) {
                const groupName = result
                    .getChild('query')
                    ?.getChild('x')
                    ?.getChildByAttr('var', 'muc#roomconfig_roomname')
                    ?.getChildText('value')

                console.info('result:groupName', groupName)

                resolve(groupName || DEFAULT_GROUP_NAME)
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
            console.info('getPublicKeyFor', result)
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
                new UniqueRoomNameQuery(),
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

            const enterMucRoomPresence = xmlUtils.buildPresence(
                new EnterMucRoomPresence({
                    from: fromUser,
                    groupId: group.id,
                }),
            )
            const onStanzaReceived = async (stanza: Element) => {
                // Receive a registration response from the server
                if (
                    stanza.is('presence') &&
                    stanza.getAttr('id') === 'enter-muc-room'
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
                                    from: fromUser,
                                    to: `${group.id}@${XMPP_MUC_DOMAIN}`,
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
                            resolve(group)
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

export const sendDirectMessage = (
    to: Member,
    message: Message,
    xmppClient: Client | null,
): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient || !xmppClient?.jid)
            return reject(i18n.t('errors.unknown-error'))

        try {
            const fromJid = xmppClient!.jid?.toString()
            const toJid = to.jid.toString()

            const directChatMessageXml = xmlUtils.buildMessage(
                new DirectChatMessage({
                    from: fromJid,
                    to: toJid,
                    message,
                }),
            )
            xmppClient!.send(directChatMessageXml)
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

            const groupChatMessageXml = xmlUtils.buildMessage(
                new GroupChatMessage({
                    from: fromJid,
                    toGroup: to,
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

export const sendUpdatePaymentMessage = (
    to: Member,
    message: Message,
    xmppClient: Client | null,
): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient || !xmppClient?.jid)
            return reject(i18n.t('errors.unknown-error'))

        try {
            const fromJid = xmppClient!.jid?.toString()
            const toJid = to.jid.toString()

            const updatePaymentMessageXml = xmlUtils.buildMessage(
                new UpdatePaymentMessage({
                    from: fromJid,
                    to: toJid,
                    message,
                }),
            )
            xmppClient!.send(updatePaymentMessageXml)
        } catch (error) {
            console.error('sendUpdatePaymentMessage', error)
            reject(i18n.t('errors.unknown-error'))
        }
    })
}
