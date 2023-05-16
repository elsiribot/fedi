import {
    xml,
    client as xmppClient,
    Client as XmppClient,
    Options as XmppOptions,
    jid as makeJid,
} from '@xmpp/client'
import type { Status as XmppStatus } from '@xmpp/connection'
import debug from '@xmpp/debug'
import StanzaError from '@xmpp/middleware/lib/StanzaError'
import parse from '@xmpp/xml/lib/parse'
import EventEmitter from 'events'
import type { Element } from 'ltx'

import { XMPP_MESSAGE_TYPES } from '../constants/xmpp'
import {
    ArchiveQueryFilters,
    ArchiveQueryPagination,
    ChatGroup,
    ChatMember,
    ChatMessage,
    Key,
    Keypair,
} from '../types'
import encryptionUtils from './EncryptionUtils'
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
    online: string
    message: ChatMessage
    memberSeen: ChatMember
    group: ChatGroup
    error: Error
}

/**
 * XmppChatClient is a class that manages the xmpp connection and provides
 * convenient events and methods that are tailored to the Fedi chat use-case.
 */
export class XmppChatClient {
    emitter = new EventEmitter()
    clients: Record<string, XmppClient | undefined> = {}

    // We have to defer initiailizing these until `.start()` instead of in the
    // constructor, so ignore uninitiailzed. Note that most any method will
    // throw until `.start()` has been called.
    xmpp!: ReturnType<typeof xmppClient>
    encryptionKeys!: Keypair

    /*** Public methods ***/

    start(options: XmppOptions, encryptionKeys: Keypair) {
        this.xmpp = xmppClient(options)
        this.encryptionKeys = encryptionKeys
        debug(this.xmpp)

        this.xmpp.on('status', this.handleStatus)
        this.xmpp.on('online', this.handleOnline)
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
                        const id = memberEl.getAttr('jid')
                        return {
                            id,
                            username: id.split('@')[0],
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
        return new Promise<string>(async (resolve, reject) => {
            try {
                const { iqCaller, jid } = this.getQueryProperties()

                const onStanzaReceived = (stanza: Element) => {
                    if (!stanza.is('message')) return
                    if (stanza.getAttr('from') !== memberId) return
                    if (stanza.getAttr('type') !== 'headline') return

                    const pubkey = stanza
                        .getChild('event')
                        ?.getChild('items')
                        ?.getChild('item')
                        ?.getChildText('entry')

                    if (pubkey) {
                        resolve(pubkey.toString())
                    } else {
                        reject(
                            new Error(
                                `Failed to retrieve pubkey for ${memberId}`,
                            ),
                        )
                    }
                }
                this.xmpp.on('stanza', onStanzaReceived)

                const getPubkeyQueryXml = xmlUtils.buildQuery(
                    new GetPublicKeyQuery({
                        from: jid.toString(),
                        to: memberId,
                    }),
                )
                await iqCaller.request(getPubkeyQueryXml)
            } catch (error: any) {
                console.error('fetchMemberPublicKey', error)
                reject(new Error('errors.unknown-error'))
            }
        })
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
    ): Promise<ChatGroup> {
        return new Promise((resolve, reject) => {
            try {
                const { iqCaller, jid } = this.getQueryProperties()
                const fromUser = jid.toString()
                const toGroup = `${groupId}@muc.${jid.getDomain()}`

                const onStanzaReceived = async (stanza: Element) => {
                    if (
                        !stanza.is('presence') ||
                        !stanza.getAttr('id')?.includes(EnterMucRoomPresence.id)
                    )
                        return

                    // Receive a registration response from the server
                    const result = stanza.getChild('x')
                    const statusResults = result?.getChildren('status')
                    if (!statusResults) {
                        return reject(
                            new Error('No status results from presence stanza'),
                        )
                    }

                    for (const sr of statusResults) {
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
                            await iqCaller.request(roomConfigQueryXml)
                            resolve({ id: groupId, name: groupName })
                        }
                        // status 110 = self-presence message which confirms
                        // occupancy in room to be added to context
                        if (sr?.getAttr('code') === '110') {
                            this.xmpp.removeListener('stanza', onStanzaReceived)
                            resolve({ id: groupId, name: '' })
                        }
                    }
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
            const fromJid = `${jid.getLocal()}@${jid.getDomain()}`

            const encrypedDirectChatMessageXml = xmlUtils.buildMessage(
                new EncryptedDirectChatMessage({
                    from: fromJid,
                    to: recipientId,
                    message: this.formatOutgoingMessage(message, jid),
                    senderKeys,
                    recipientPublicKey: { hex: recipientPubkey },
                    updatePayment,
                }),
            )
            await this.xmpp.send(encrypedDirectChatMessageXml)
        } catch (error) {
            console.error('sendDirectMessage', error)
            throw new Error('errors.unknown-error')
        }
    }

    async sendGroupMessage(group: Partial<ChatGroup>, message: ChatMessage) {
        try {
            const { jid } = this.getQueryProperties()
            const fromJid = jid.toString()
            const toGroup = `${group.id}@muc.${jid.getDomain()}`

            const groupChatMessageXml = xmlUtils.buildMessage(
                new GroupChatMessage({
                    from: fromJid,
                    to: toGroup,
                    message: this.formatOutgoingGroupMessage(
                        message,
                        group,
                        jid,
                    ),
                }),
            )
            await this.xmpp.send(groupChatMessageXml)
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
        this.emitter.on(eventName, handler)
    }

    off<TEventName extends keyof XmppChatClientEventMap>(
        eventName: TEventName,
        handler: (argument: XmppChatClientEventMap[TEventName]) => void,
    ) {
        this.emitter.off(eventName, handler)
    }

    removeAllListeners(event?: keyof XmppChatClientEventMap) {
        this.emitter.removeAllListeners(event)
    }

    /*** Private methods ***/

    private handleStatus = (status: XmppStatus) => {
        this.emit('status', status)
    }

    private handleOnline = (address: string) => {
        this.xmpp.send(xml('presence'))
        this.emit('online', address)
    }

    private handleStanza = (stanza: Element) => {
        try {
            // Messages
            if (stanza.is('message')) {
                switch (stanza.getAttr('type')) {
                    // Handle incoming messages from GroupChat
                    case XMPP_MESSAGE_TYPES.GROUPCHAT: {
                        return this.handleIncomingGroupMessage(stanza)
                    }
                    // Handle incoming messages from DirectChat while online
                    case XMPP_MESSAGE_TYPES.CHAT: {
                        return this.handleIncomingDirectMessage(stanza)
                    }
                    // Handle incoming messages after subscribing to user
                    // public key for e2e encryption
                    case XMPP_MESSAGE_TYPES.HEADLINE: {
                        return this.handleSubscriptionEvent(stanza)
                    }
                }
                // Handle archive messages received while offline, typically
                // triggered by the fetchMessagesFromArchive hook
                if (
                    stanza
                        .getChild('result')
                        ?.getAttr('queryid')
                        .includes(GetMessagesQuery.id)
                ) {
                    return this.handleIncomingMessageHistory(stanza)
                }
            }

            // Queries
            if (stanza.is('iq')) {
                if (stanza.getChild('query')?.getNS() === 'jabber:iq:roster') {
                    return this.handleIncomingRoster(stanza)
                }
            }
        } catch (err) {
            console.error('Error parsing XMPP stanza', stanza, err)
        }
    }

    private handleIncomingGroupMessage(stanza: Element) {
        const bodyText = stanza.getChildText('body')
        if (!bodyText) return

        const groupMessageJson = stanza.getChildText('gm')
        const parsedMessage = JSON.parse(groupMessageJson as string)
        if (!parsedMessage) return

        // Emit a 'message'
        this.emit('message', this.formatIncomingMessage(parsedMessage))

        // Emit a 'memberSeen' for the person who sent it in case we hadn't seen them before
        const id = stanza.getAttr('from')
        if (id) {
            this.emit('memberSeen', { id, username: id.split('@')[0] })
        }

        // Emit a 'group' for the group this is in, in case we hadn't seen it or it has a new name
        const group = parsedMessage.sentIn
        if (group) {
            this.emit('group', {
                id: group.id,
                name: group.name,
            })
        }
    }

    private handleIncomingDirectMessage(stanza: Element) {
        const { parsedMessage } = this.decryptAndParseIncomingMessage(stanza)

        // Emit a 'message'
        this.emit('message', this.formatIncomingMessage(parsedMessage))

        // Emit a 'memberSeen' for the person who sent it in case we hadn't seen them before
        const id = stanza.getAttr('from')
        if (id) {
            this.emit('memberSeen', { id, username: id.split('@')[0] })
        }
    }

    private handleSubscriptionEvent(stanza: Element) {
        const event = stanza.getChild('event')

        const items = event?.getChild('items')
        const nodeId = items?.getAttr('node') as string

        const publishedItem = items?.getChild('item')
        const publisherJid: string | undefined =
            publishedItem?.getAttr('publisher')
        if (!publisherJid) {
            console.warn('subscription event did not have jid', stanza)
            return
        }

        // if the node ID does not match the publisher JID... this pubkey
        // was not published by Fedi source code...
        // do not overwrite the locally stored pubkey for this member
        // TODO: implement signature validation for authentication?
        const publisherUsername = publisherJid.split('@')[0]
        if (!nodeId.includes(publisherUsername)) {
            console.warn(
                'node ID does not match the publisher username',
                stanza,
            )
            return
        }

        const pubkey = publishedItem?.getChildText('entry')
        if (!pubkey) {
            console.warn('subscription event did not have pubkey', stanza)
            return
        }

        const publishingMember: ChatMember = {
            id: publisherJid,
            username: publisherUsername,
            publicKeyHex: pubkey,
        }
        console.info('publishingMember', publishingMember)

        this.emit('memberSeen', publishingMember)
    }

    private handleIncomingMessageHistory(stanza: Element) {
        const result = stanza.getChild('result')
        const forwarded = result?.getChild('forwarded')
        const message = forwarded?.getChild('message')
        if (!message || message.getAttr('type') === 'error') return

        const { parsedMessage } = this.decryptAndParseIncomingMessage(message)

        // Emit a 'message'
        this.emit('message', this.formatIncomingMessage(parsedMessage))

        // Emit a 'memberSeen' for the person who sent it in case we hadn't seen them before
        const id = message.getAttr('from')
        if (id) {
            this.emit('memberSeen', { id, username: id.split('@')[0] })
        }
    }

    private handleIncomingRoster(stanza: Element) {
        const rosterItem = stanza.getChild('query')?.getChild('item')
        if (!rosterItem) return

        const id = rosterItem?.getAttr('jid')
        if (id) {
            this.emit('memberSeen', { id, username: id.split('@') })
        }
    }

    private handleError = (error: Error) => {
        console.error('xmpp error', error)
        this.emit('error', error)
    }

    private getQueryProperties() {
        const { iqCaller, jid } = this.xmpp
        if (!jid) throw new Error('No JID')
        return { iqCaller, jid }
    }

    private decryptAndParseIncomingMessage(message: Element) {
        let directMessageJson: string | null
        let action: Element | undefined
        const encrypted = message.getChild('encrypted')
        if (encrypted) {
            // First decrypt the payload
            const header = encrypted.getChild('header')
            const keys = header?.getChild('keys')
            const senderPublicKey = keys?.getChildText('key')
            if (!senderPublicKey) {
                throw new Error('Missing sender public key')
            }

            let encryptedPayloadContents = encrypted.getChildText('payload')

            const { privateKey, publicKey } = this.encryptionKeys

            // If we sent this message, decrypt the backup-payload
            // instead since we encrypted it to our own pubkey
            if (senderPublicKey === publicKey.hex) {
                encryptedPayloadContents =
                    encrypted.getChildText('backup-payload')
            }
            const decryptedPayload = encryptionUtils.decryptMessage(
                encryptedPayloadContents!,
                { hex: senderPublicKey },
                privateKey,
            )

            const decryptedEnvelope = parse(decryptedPayload)
            const content = decryptedEnvelope.getChild('content')
            if (!content) {
                throw new Error('Missing content in decrypted envelope')
            }
            directMessageJson = content.getChildText('dm')
            action = content.getChild('action')
        } else {
            // TODO: remove this... only left it in case it helps with
            // backwards compatibility
            directMessageJson = message.getChildText('dm')
            action = message.getChild('action')
        }

        if (!directMessageJson) {
            throw new Error('Missing message JSON in message content')
        }

        // TODO: Validate the message matches the shape?
        const parsedMessage = JSON.parse(directMessageJson)
        return { parsedMessage, action }
    }

    private formatIncomingMessage(rawMessage: any): ChatMessage {
        const formatIncomingEntity = (
            sentEntity:
                | string
                | { id: string }
                | { jid: { _local: string; _domain: string } }
                | undefined,
        ) => {
            if (!sentEntity) return undefined
            if (typeof sentEntity === 'string') return sentEntity
            if ('id' in sentEntity) return sentEntity.id
            if ('jid' in sentEntity)
                return `${sentEntity.jid._local}@${sentEntity.jid._domain}`
        }

        const sentBy = formatIncomingEntity(rawMessage.sentBy)
        if (!sentBy) {
            throw new Error('Incoming message missing sentBy')
        }

        let payment = { ...rawMessage.payment }
        if (payment.recipient) {
            payment.recipient = formatIncomingEntity(payment.recipient)
        }

        return {
            id: rawMessage.id,
            content: rawMessage.content,
            sentAt: rawMessage.sentAt,
            sentBy,
            sentTo: formatIncomingEntity(rawMessage.sentTo),
            sentIn: formatIncomingEntity(rawMessage.sentIn),
            payment,
        }
    }

    private formatOutgoingMessage(
        message: ChatMessage,
        jid: ReturnType<typeof makeJid>,
    ) {
        const idToJidMember = (id: string) => {
            return {
                jid: {
                    _local: id.split('@')[0],
                    _domain: id.split('@')[1],
                },
            }
        }

        const outgoing: any = {
            ...message,
            sentBy: idToJidMember(jid.toString()),
        }
        if (message.sentTo) {
            outgoing.sentTo = idToJidMember(message.sentTo)
        }
        if (message.payment) {
            if (message.payment.recipient) {
                outgoing.payment = {
                    ...outgoing.payment,
                    recipient: idToJidMember(outgoing.payment.recipient),
                }
            }
        }

        return outgoing
    }

    private formatOutgoingGroupMessage(
        message: ChatMessage,
        group: Partial<ChatGroup>,
        jid: ReturnType<typeof makeJid>,
    ) {
        return {
            ...this.formatOutgoingMessage(message, jid),
            sentIn: {
                id: group.id,
                name: group.name,
            },
        }
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
