import { xml } from '@xmpp/client'
import { JID } from '@xmpp/jid'
import { Element } from 'ltx'
import { useCallback, useEffect, useRef } from 'react'
import uuid from 'react-native-uuid'
import {
    addressOrInvoice,
    approveSocialRecoveryRequest,
    authenticateGuardian,
    completeSocialRecovery,
    denySocialRecoveryRequest,
    generateAddress,
    generateEcash,
    generateInvoice,
    getMnemonic,
    leaveFederation,
    LightningGateway,
    listGateways,
    listTransactions,
    lnurlSignMessage,
    locateRecoveryFile,
    payAddress,
    payInvoice,
    receiveEcash,
    recoverFromMnemonic,
    recoveryQr,
    socialRecoveryApprovals,
    socialRecoveryDownloadVerificationDoc,
    switchGateway,
    updateTransactionNotes,
    uploadBackupFile,
    validateEcash,
    validateRecoveryFile,
} from '../../bridge'
import { XMPP_MUC_DOMAIN } from '../../constants'
import { Member, Message, MSats, Room, Sats } from '../../types'
import lnurlUtils from '../../utils/LNURLUtils'
import { addToRooms, useCommunityContext } from '../contexts/CommunityContext'
import { useFederationsContext } from '../contexts/FederationsContext'

export const usePrevious = <T extends unknown>(value: T): T | undefined => {
    const ref = useRef<T>()
    useEffect(() => {
        ref.current = value
    })
    return ref.current
}

export const useBridge = () => {
    const { state } = useFederationsContext()
    const { selectedFederation } = state

    return {
        addressOrInvoice: useCallback(
            (input: string) => {
                return addressOrInvoice(input, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        approveSocialRecoveryRequest: useCallback(
            (recoveryId: string) => {
                return approveSocialRecoveryRequest(
                    recoveryId,
                    selectedFederation!.name,
                )
            },
            [selectedFederation],
        ),
        authenticateGuardian: useCallback(
            (secret: string) => {
                return authenticateGuardian(secret, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        recoveryQr: useCallback(() => {
            return recoveryQr(selectedFederation!.name)
        }, [selectedFederation]),
        leaveFederation: useCallback(() => {
            return leaveFederation(selectedFederation!.name)
        }, [selectedFederation]),
        generateAddress: useCallback(() => {
            return generateAddress(selectedFederation!.name)
        }, [selectedFederation]),
        socialRecoveryApprovals: useCallback(() => {
            return socialRecoveryApprovals(selectedFederation!.name)
        }, [selectedFederation]),
        generateEcash: useCallback(
            (amount: MSats) => {
                return generateEcash(amount, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        generateInvoice: useCallback(
            (amount: MSats, description: string) => {
                return generateInvoice(
                    amount,
                    description,
                    selectedFederation!.name,
                )
            },
            [selectedFederation],
        ),
        getMnemonic: useCallback(() => {
            return getMnemonic(selectedFederation!.name)
        }, [selectedFederation]),
        listTransactions: useCallback(() => {
            return listTransactions(selectedFederation!.name)
        }, [selectedFederation]),
        lnurlSignMessage: useCallback(
            (url: string) => {
                return lnurlSignMessage(url, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        lnurlGetToken: useCallback(
            (lnurl: string) => {
                return lnurlUtils.getToken(lnurl, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        updateTransactionNotes: useCallback(
            (transactionId: string, notes: string) => {
                return updateTransactionNotes(
                    transactionId,
                    notes,
                    selectedFederation!.name,
                )
            },
            [selectedFederation],
        ),
        listGateways: useCallback(() => {
            return listGateways(selectedFederation!.name)
        }, [selectedFederation]),
        switchGateway: useCallback(
            (gateway: LightningGateway) => {
                return switchGateway(gateway, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        locateRecoveryFile: useCallback(() => {
            return locateRecoveryFile(selectedFederation!.name)
        }, [selectedFederation]),
        completeSocialRecovery: useCallback(() => {
            return completeSocialRecovery(selectedFederation!.name)
        }, [selectedFederation]),
        payInvoice: useCallback(
            (invoice: string) => {
                return payInvoice(invoice, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        payAddress: useCallback(
            (address: string, sats: Sats) => {
                return payAddress(address, sats, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        receiveEcash: useCallback(
            (ecash: string) => {
                return receiveEcash(ecash, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        recoverFromMnemonic: useCallback(
            (mnemonic: string[]) => {
                return recoverFromMnemonic(mnemonic, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        denySocialRecoveryRequest: useCallback(
            (userPublicKey: string) => {
                return denySocialRecoveryRequest(
                    userPublicKey,
                    selectedFederation!.name,
                )
            },
            [selectedFederation],
        ),
        socialRecoveryDownloadVerificationDoc: useCallback(
            (recoveryId: string) => {
                return socialRecoveryDownloadVerificationDoc(
                    recoveryId,
                    selectedFederation!.name,
                )
            },
            [selectedFederation],
        ),
        validateRecoveryFile: useCallback(
            (file: string) => {
                return validateRecoveryFile(file, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        validateEcash: useCallback(
            (ecash: string) => {
                return validateEcash(ecash, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        uploadBackupFile: useCallback(
            (videoFilePath: string) => {
                return uploadBackupFile(videoFilePath, selectedFederation!.name)
            },
            [selectedFederation],
        ),
    }
}

type OutgoingMessage = {
    text?: string
    from?: Member
    to?: Member
    message: Message
}
type OutgoingGroupMessage = {
    text?: string
    fromUser?: string
    toRoom?: string
}
type ArchiveQueryFilters = {
    withJid?: string | null
}
type MessageArchiveQuery = {
    filters?: ArchiveQueryFilters | null
}
export const useXmpp = () => {
    const { state, dispatch } = useCommunityContext()
    const { xmppClient } = state

    return {
        // subscribeToMessages(room)
        //      addToMembers
        // subscribeToMembers(room)
        //      addToMembers
        // subscribeToRosterUpdates
        //      addToMembers
        // unsubscribeFromRoomMessages
        // unsubscribeFromRoomMembers

        /*
            - add easy uuid generation for messages
            - improve debug logs
                - add platform
                - add newlines to XML
            - exiting a room, clean up and unsubscribe?

            - fetch rooms (server defined)
            - determine rooms from stored messages
                - subscribe to all rooms to receive new messages + store them
            - determine rooms from stored members
                - subscribe to all rooms to receive new members + store them
            - subscribe to universal room to enable search
              by username? performance concerns?

        */
        enterMucRoom: useCallback(
            async (room: Room) => {
                const { local, domain, resource } = xmppClient?.jid as JID
                const fromUser = `${local}@${domain}/${resource}`
                const onStanzaReceived = async (stanza: Element) => {
                    // Receive a registration response from the server
                    if (
                        stanza.is('presence') &&
                        stanza.getAttr('id') === 'enter-muc-room'
                    ) {
                        const result = stanza.getChild('x')
                        const statusResults = result?.getChildren('status')

                        statusResults?.map(async sr => {
                            // status 201 = configuration required, send an "Instant Room"
                            // configuration query to allow others to join
                            // https://xmpp.org/extensions/xep-0045.html#createroom-instant
                            if (sr?.getAttr('code') === '201') {
                                await xmppClient?.send(
                                    xml(
                                        'iq',
                                        {
                                            from: fromUser,
                                            to: `${room.id}@${XMPP_MUC_DOMAIN}`,
                                            id: 'create-instant-muc-room',
                                            type: 'set',
                                        },
                                        xml(
                                            'query',
                                            {
                                                xmlns: 'http://jabber.org/protocol/muc#owner',
                                            },
                                            xml('x', {
                                                xmlns: 'jabber:x:data',
                                                type: 'submit',
                                            }),
                                        ),
                                    ),
                                )
                            }
                            // status 110 = self-presence message which confirms
                            // occupancy in room to be added to context
                            if (sr?.getAttr('code') === '110') {
                                xmppClient?.removeListener(
                                    'stanza',
                                    onStanzaReceived,
                                )
                                dispatch(addToRooms(room))
                            }
                        })
                    }
                }
                xmppClient?.on('stanza', onStanzaReceived)

                // do we need to clean up listeners if dependencies change
                // and this callback gets re-run? count listeners to monitor this
                console.info(
                    'xmppClient has',
                    xmppClient?.listenerCount('stanza'),
                    'listeners',
                )

                await xmppClient?.send(
                    xml(
                        'presence',
                        {
                            from: fromUser,
                            to: `${room.id}@${XMPP_MUC_DOMAIN}/${local}`,
                            id: 'enter-muc-room',
                        },
                        xml('x', { xmlns: 'http://jabber.org/protocol/muc' }),
                    ),
                )
            },
            [dispatch, xmppClient],
        ),
        fetchMessagesFromArchive: useCallback(
            async ({ filters }: MessageArchiveQuery) => {
                const filterQuery = filters?.withJid
                    ? xml(
                          'x',
                          {
                              xmlns: 'jabber:x:data',
                              type: 'submit',
                          },
                          xml(
                              'field',
                              { var: 'FORM_TYPE', type: 'hidden' },
                              xml('value', {}, 'urn:xmpp:mam:2'),
                          ),
                          xml(
                              'field',
                              { var: 'with' },
                              xml('value', {}, filters.withJid),
                          ),
                      )
                    : xml('x')

                await xmppClient?.send(
                    xml(
                        'iq',
                        {
                            id: 'get-messages',
                            type: 'set',
                        },
                        xml(
                            'query',
                            {
                                xmlns: 'urn:xmpp:mam:2',
                                queryid: 'get-messages',
                            },
                            filterQuery,
                        ),
                    ),
                )
            },
            [xmppClient],
        ),
        getUniqueRoomName: useCallback((): Promise<string> => {
            return new Promise(resolve => {
                // Make sure the stream is open before sending the
                // registration request
                const uniqueRoomListener = async (stanza: Element) => {
                    console.log(stanza)
                    // Receive a registration response from the server
                    if (
                        stanza.is('iq') &&
                        stanza.getAttr('id') === 'get-unique-room-name'
                    ) {
                        xmppClient?.removeListener('stanza', uniqueRoomListener)
                        // Resolve or reject the promise based on registration response
                        if (stanza.getAttr('type') === 'result') {
                            console.log(stanza.getChild('unique'))
                            const roomName = stanza.getChildText(
                                'unique',
                            ) as string

                            resolve(roomName)
                        }
                    }
                }
                xmppClient?.on('stanza', uniqueRoomListener)

                xmppClient?.send(
                    xml(
                        'iq',
                        {
                            type: 'get',
                            to: XMPP_MUC_DOMAIN,
                            id: 'get-unique-room-name',
                        },
                        xml('unique', {
                            xmlns: 'http://jabber.org/protocol/muc#unique',
                        }),
                    ),
                )
            })
        }, [xmppClient]),
        sendUpdatedPaymentMessage: useCallback(
            async ({ message, to }: OutgoingMessage) => {
                const fromJid = xmppClient?.jid?.toString()
                const toJid = to?.jid.toString()

                await xmppClient?.send(
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
            },
            [xmppClient],
        ),
        sendDirectMessage: useCallback(
            async ({ message, to }: OutgoingMessage) => {
                const fromJid = xmppClient?.jid?.toString()
                const toJid = to?.jid.toString()

                await xmppClient?.send(
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
            },
            [xmppClient],
        ),
        sendGroupMessage: useCallback(
            async ({ text, toRoom }: OutgoingGroupMessage) => {
                const { local, domain, resource } = xmppClient?.jid as JID
                const fromUser = `${local}@${domain}/${resource}`
                const to = `${toRoom}@${XMPP_MUC_DOMAIN}`

                await xmppClient?.send(
                    xml(
                        'message',
                        {
                            id: uuid.v4(),
                            from: fromUser,
                            type: 'groupchat',
                            to,
                        },
                        xml('body', { xmlns: 'jabber:client' }, text as string),
                    ),
                )
            },
            [xmppClient],
        ),
        sendTestXml: useCallback(async () => {
            await xmppClient?.send(
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
