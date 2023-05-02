// This file contains logic for preparing XML, sending XMPP stanzas
// to the chat server, and handling responses (if any)
import { Client, jid } from '@xmpp/client'
import XMPPError from '@xmpp/error'
import { Element } from 'ltx'

import { Key, Keypair, XmppChatMember } from '@fedi/common/types'

import { DEFAULT_GROUP_NAME } from '../../constants'
import i18n from '../../localization/i18n'
import {
    ArchiveQueryFilters,
    ArchiveQueryPagination,
    Group,
    Message,
} from '../../types'
import xmlUtils, {
    AddToRosterQuery,
    EncryptedDirectChatMessage,
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
} from '../../utils/XmlUtils'

export const addMemberToRoster = (
    memberUsername: string,
    xmppClient: Client | null,
): Promise<XmppChatMember> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient?.jid) return reject(i18n.t('errors.unknown-error'))

        try {
            const { iqCaller } = xmppClient! as Client
            const roomConfigQueryXml = xmlUtils.buildQuery(
                new AddToRosterQuery({
                    newRosterItem: `${memberUsername}@${xmppClient.jid.getDomain()}`,
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
    xmppClient: Client | null,
): Promise<string | null> => {
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

            resolve(lastMessageId)
        } catch (error) {
            console.error('fetchMessagesFromArchive', error)
        }
    })
}

export const fetchRoster = (
    xmppClient: Client | null,
): Promise<XmppChatMember[]> => {
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
            let membersSeen: XmppChatMember[] = []
            if (result.getChild('query')) {
                console.debug('query', result.getChild('query'))
                const rosterMembers = result
                    .getChild('query')
                    ?.getChildren('item')
                console.debug('rosterMembers', rosterMembers)

                membersSeen = rosterMembers!
                    .map(rm => {
                        const memberJid = jid(rm.getAttr('jid'))
                        return {
                            id: memberJid.getLocal(),
                            username: memberJid.getLocal(),
                            jid: rm.getAttr('jid'),
                        }
                    })
                    .filter(m => {
                        // Never add ourselves to membersSeen
                        return m.username !== xmppClient?.jid?.getLocal()
                    })

                console.debug('membersSeen', membersSeen)

                resolve(membersSeen)
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
                    to: `${group.id}@muc.${xmppClient.jid!.getDomain()}`,
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
    jid: string,
    xmppClient: Client | null,
): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient?.jid) return reject(i18n.t('errors.unknown-error'))

        try {
            const { iqCaller } = xmppClient! as Client
            const getPubkeyQueryXml = xmlUtils.buildQuery(
                new GetPublicKeyQuery({
                    from: xmppClient!.jid!.toString(),
                    to: jid,
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
    toJid: string,
    toPublicKey: string,
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

            const encrypedDirectChatMessageXml = xmlUtils.buildMessage(
                new EncryptedDirectChatMessage({
                    from: fromJid,
                    to: toJid,
                    message,
                    senderKeys: withEncryptionKeys as Keypair,
                    recipientPublicKey: { hex: toPublicKey as string },
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
