import { Client, jid } from '@xmpp/client'
import XMPPError from '@xmpp/error'

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
} from '../../types'
import xmlUtils, {
    AddToRosterQuery,
    GetMessagesQuery,
    GetRoomConfigQuery,
    GetRosterQuery,
    SetRoomConfigQuery,
    UniqueRoomNameQuery,
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
        if (!xmppClient?.jid) reject(i18n.t('errors.unknown-error'))

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
        if (!xmppClient?.jid) reject(i18n.t('errors.unknown-error'))

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
        if (!xmppClient?.jid) reject(i18n.t('errors.unknown-error'))

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
        if (!xmppClient?.jid) reject(i18n.t('errors.unknown-error'))

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
        if (!xmppClient?.jid) reject(i18n.t('errors.unknown-error'))

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

export const getUniqueGroupId = (
    xmppClient: Client | null,
): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        if (!xmppClient?.jid) reject(i18n.t('errors.unknown-error'))

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
