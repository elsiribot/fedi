import {
    Client,
    client as xmppClient,
    Client as XmppClient,
    Options as XmppOptions,
} from '@xmpp/client'
import type { Status as XmppStatus } from '@xmpp/connection'
import debug from '@xmpp/debug'
import StanzaError from '@xmpp/middleware/lib/StanzaError'
import EventEmitter from 'events'
import type { Element } from 'ltx'

import {
    ArchiveQueryFilters,
    ArchiveQueryPagination,
    ChatMember,
    ChatMessage,
    Key,
    Keypair,
} from '../types'
import xmlUtils, {
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
} from './XmlUtils'

interface XmppChatClientEventMap {
    status: XmppStatus
    message: ChatMessage
    memberSeen: ChatMember
    error: Error
}

/**
 * XmppChatClient is a class that manages the xmpp connection and provides
 * convenient events and methods that are tailored to the Fedi chat use-case.
 */
export class XmppChatClient {
    xmpp = xmppClient()
    emitter = new EventEmitter()
    clients: Record<string, XmppClient | undefined> = {}

    constructor() {
        this.xmpp = xmppClient()
        debug(this.xmpp)
    }

    /*** Public methods ***/

    start(options: XmppOptions) {
        this.xmpp.options = options
        this.xmpp.on('status', this.handleStatus)
        this.xmpp.on('stanza', this.handleStanza)
        this.xmpp.on('error', this.handleError)
        return this.xmpp.start().catch(this.handleError)
    }

    async stop() {
        try {
            await this.xmpp.stop()
        } catch (err) {
            console.warn(`Encountered error when stopping xmpp client`, err)
        }
    }

    /**
     * This sends a request that causes a bunch of `message` events to trigger,
     * doesn't actually return message history.
     */
    async fetchMessageHistory(
        filters: ArchiveQueryFilters | null,
        pagination: ArchiveQueryPagination | null,
    ): Promise<string | null> {
        try {
            const { iqCaller } = this.getQueryProperties()
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
            if (!results) return null

            const lastMessageId = results.getChild('last')?.getText()
            if (lastMessageId) return lastMessageId
        } catch (err) {
            console.error('fetchMessageHistory', err)
        }
        return null
    }

    /**
     * This sends a request that causes a bunch of `memberSeen` events to
     * trigger, doesn't actually return all members.
     */
    async fetchMembers(): Promise<ChatMember[]> {
        try {
            const { iqCaller, jid } = this.getQueryProperties()
            const roomConfigQueryXml = xmlUtils.buildQuery(
                new GetRosterQuery({
                    from: jid.toString(),
                }),
            )
            const result = await iqCaller.request(roomConfigQueryXml)
            console.debug('fetchMembers', result)
            let membersSeen: ChatMember[] = []
            if (result.getChild('query')) {
                console.debug('query', result.getChild('query'))
                const rosterMembers = result
                    .getChild('query')
                    ?.getChildren('item')
                console.debug('rosterMembers', rosterMembers)

                if (rosterMembers) {
                    membersSeen = rosterMembers.map(memberEl => {
                        const id = memberEl.getAttr('jid').split('@')[0]
                        return {
                            id,
                            username: id,
                        }
                    })
                }
            }
            console.debug('membersSeen', membersSeen)
            return membersSeen
        } catch (error) {
            throw new Error('errors.unknown-error')
        }
    }

    async fetchMemberPublicKey(memberId: string) {
        try {
            const { iqCaller, jid } = this.getQueryProperties()
            const getPubkeyQueryXml = xmlUtils.buildQuery(
                new GetPublicKeyQuery({
                    from: jid.toString(),
                    to: `${memberId}@${jid.getDomain()}`,
                }),
            )
            const result = await iqCaller.request(getPubkeyQueryXml)
            console.debug('fetchMemberPublicKey', result.toString())
            return true
        } catch (error: any) {
            console.error('fetchMemberPublicKey', error)
            throw new Error('errors.unknown-error')
        }
    }

    async publishPublicKey(pubkey: Key) {
        try {
            const { iqCaller, jid } = this.getQueryProperties()
            const publishPubkeyQueryXml = xmlUtils.buildQuery(
                new PublishPublicKeyQuery({
                    pubkey: pubkey.hex,
                    from: jid.toString(),
                }),
            )
            const result = await iqCaller.request(publishPubkeyQueryXml)
            console.info('publishPublicKey', result)
            const setPubsubNodeConfigQueryXml = xmlUtils.buildQuery(
                new SetPubsubNodeConfigQuery({
                    from: jid.toString(),
                }),
            )
            await iqCaller.request(setPubsubNodeConfigQueryXml)
        } catch (error: any) {
            console.error('publishPublicKey', error)
            throw new Error('errors.unknown-error')
        }
    }

    async generateUniqueGroupId() {
        try {
            const { iqCaller, jid } = this.getQueryProperties()
            const uniqeRoomNameXml = xmlUtils.buildQuery(
                new UniqueRoomNameQuery({
                    to: `muc.${jid.getDomain()}`,
                }),
            )
            const response = await iqCaller.request(uniqeRoomNameXml)
            const groupId = response.getChildText('unique') as string
            if (!groupId) throw new Error('Missing group ID from response')
            return groupId
        } catch (err) {
            console.error('generateUniqueGroupId', err)
            throw new Error('errors.unknown-error')
        }
    }

    async joinGroup(
        groupId: string,
        groupName: string = 'New group',
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const { iqCaller, jid } = this.getQueryProperties()
                const fromUser = jid.toString()
                const toGroup = `${groupId}@muc.${jid.getDomain()}`

                const onStanzaReceived = (stanza: Element) => {
                    if (
                        !stanza.is('presence') ||
                        !stanza.getAttr('id').includes(EnterMucRoomPresence.id)
                    )
                        return

                    // Receive a registration response from the server
                    const result = stanza.getChild('x')
                    const statusResults = result?.getChildren('status')
                    if (!statusResults) {
                        throw new Error(
                            'No status results from presence stanza',
                        )
                    }

                    console.log('statusResults', statusResults)
                    statusResults.map(sr => {
                        // status 201 = configuration required, send a room
                        // configuration query to allow others to join
                        // https://xmpp.org/extensions/xep-0045.html#createroom-reserved
                        if (sr?.getAttr('code') === '201') {
                            console.info(
                                `Received room configuration required for ${groupId}`,
                            )
                            const roomConfigQueryXml = xmlUtils.buildQuery(
                                new SetRoomConfigQuery({
                                    roomName: groupName,
                                    from: fromUser,
                                    to: toGroup,
                                }),
                            )
                            console.info('Sending config for new group')
                            iqCaller.request(roomConfigQueryXml)
                        }
                        // status 110 = self-presence message which confirms
                        // occupancy in room to be added to context
                        if (sr?.getAttr('code') === '110') {
                            this.xmpp.removeListener('stanza', onStanzaReceived)
                            resolve(undefined)
                        }
                    })
                }
                this.xmpp.on('stanza', onStanzaReceived)

                const enterMucRoomPresence = xmlUtils.buildPresence(
                    new EnterMucRoomPresence({
                        from: fromUser,
                        toGroup,
                    }),
                )
                this.xmpp.send(enterMucRoomPresence)
            } catch (err) {
                console.error('joinGroup', err)
                reject(new Error('errors.unknown-error'))
            }
        })
    }

    async configureGroup(groupId: string, updatedName: string): Promise<void> {
        try {
            const { iqCaller, jid } = this.getQueryProperties()
            const roomConfigQueryXml = xmlUtils.buildQuery(
                new SetRoomConfigQuery({
                    roomName: updatedName,
                    from: jid.toString(),
                    to: `${groupId}@muc.${jid.getDomain()}`,
                }),
            )
            await iqCaller.request(roomConfigQueryXml)
        } catch (error) {
            console.error('changeMucRoomName', error)
            if (
                (error as StanzaError) &&
                (error as StanzaError).name === 'StanzaError' &&
                (error as StanzaError).type === 'auth' &&
                (error as StanzaError).condition === 'forbidden'
            ) {
                throw new Error('errors.only-group-owners-can-change-name')
            }
            throw new Error('errors.unknown-error')
        }
    }

    async fetchGroupConfig(groupId: string) {
        try {
            const { iqCaller, jid } = this.getQueryProperties()
            const roomConfigQueryXml = xmlUtils.buildQuery(
                new GetRoomConfigQuery({
                    from: jid.toString(),
                    to: `${groupId}@muc.${jid.getDomain()}`,
                }),
            )
            const result = await iqCaller.request(roomConfigQueryXml)
            console.info('fetchMucRoomConfig', result)
            return (
                result
                    .getChild('query')
                    ?.getChild('x')
                    ?.getChildByAttr('var', 'muc#roomconfig_roomname')
                    ?.getChildText('value') || null
            )
        } catch (error) {
            console.error('fetchMucRoomConfig', error)
            throw new Error('errors.unknown-error')
        }
    }

    async sendDirectMessage(
        recipientId: string,
        recipientPubkey: string,
        message: ChatMessage,
        senderKeys: Keypair,
        updatePayment?: boolean,
    ) {
        try {
            const { jid } = this.getQueryProperties()
            const fromJid = jid.toString()
            const toJid = `${recipientId}@${jid.getDomain()}`

            const encrypedDirectChatMessageXml = xmlUtils.buildMessage(
                new EncryptedDirectChatMessage({
                    from: fromJid,
                    to: toJid,
                    message,
                    senderKeys,
                    recipientPublicKey: { hex: recipientPubkey },
                    updatePayment,
                }),
            )
            this.xmpp.send(encrypedDirectChatMessageXml)
        } catch (error) {
            console.error('sendDirectMessage', error)
            throw new Error('errors.unknown-error')
        }
    }

    async sendGroupMessage(groupId: string, message: ChatMessage) {
        try {
            const { jid } = this.getQueryProperties()
            const fromJid = jid.toString()
            const toGroup = `${groupId}@muc.${jid.getDomain()}`

            const groupChatMessageXml = xmlUtils.buildMessage(
                new GroupChatMessage({
                    from: fromJid,
                    to: toGroup,
                    message,
                }),
            )
            this.xmpp.send(groupChatMessageXml)
        } catch (error) {
            console.error('sendGroupMessage', error)
            throw new Error('errors.unknown-error')
        }
    }

    emit<TEventName extends keyof XmppChatClientEventMap>(
        eventName: TEventName,
        argument: XmppChatClientEventMap[TEventName],
    ) {
        this.emitter.emit(eventName, argument)
    }

    on<TEventName extends keyof XmppChatClientEventMap>(
        eventName: TEventName,
        handler: (argument: XmppChatClientEventMap[TEventName]) => void,
    ) {
        this.emitter.on(eventName, handler as any)
    }

    off<TEventName extends keyof XmppChatClientEventMap>(
        eventName: TEventName,
        handler: (argument: XmppChatClientEventMap[TEventName]) => void,
    ) {
        this.emitter.off(eventName, handler as any)
    }

    removeAllListeners(event?: keyof XmppChatClientEventMap) {
        this.emitter.removeAllListeners(event)
    }

    /*** Private methods ***/

    private handleStatus(status: XmppStatus) {
        console.log('xmpp status', status)
        this.emit('status', status)
    }

    private handleStanza(element: Element) {
        console.log('xmpp stanza', element)
    }

    private handleError(error: Error) {
        console.error('xmpp error', error)
        this.emit('error', error)
    }

    private getQueryProperties() {
        const { iqCaller, jid } = this.xmpp
        if (!jid) throw new Error('No JID')
        return { iqCaller, jid }
    }
}

/**
 * A simple manager of chat clients to allow for multi-federation chat handling.
 */
export class XmppChatClientManager {
    clients: Record<string, XmppChatClient | undefined> = {}

    getClient(federationId: string) {
        let client = this.clients[federationId]
        if (!client) {
            client = new XmppChatClient()
            this.clients[federationId] = client
        }
        return client
    }

    async destroyClient(federationId: string) {
        let client = this.clients[federationId]
        if (client) {
            client.removeAllListeners()
            await client.stop()
            delete this.clients[federationId]
        }
    }
}
