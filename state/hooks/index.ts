import { xml } from '@xmpp/client'
import { JID } from '@xmpp/jid'
import { Element } from 'ltx'
import { useCallback, useEffect, useRef } from 'react'
import uuid from 'react-native-uuid'
import {
    addressOrInvoice,
    approveSocialRecoveryRequest,
    authenticateGuardian,
    backupQr,
    denySocialRecoveryRequest,
    generateAddress,
    generateEcash,
    generateInvoice,
    generateMnemonic,
    LightningGateway,
    listGateways,
    listTransactions,
    lnurlSignMessage,
    locateRecoveryFile,
    payAddress,
    payInvoice,
    receiveEcash,
    recoverFromMnemonic,
    switchGateway,
    updateTransactionNotes,
    uploadBackupFile,
    validateBackupFile,
    validateEcash,
} from '../../bridge'
import { MSats, Room, Sats } from '../../types'
import lnurlUtils from '../../utils/LNURLUtils'
import {
    useCommunityContext,
    XMPP_MUC_DOMAIN,
} from '../contexts/CommunityContext'
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
            (userPublicKey: string) => {
                return approveSocialRecoveryRequest(
                    userPublicKey,
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
        backupQr: useCallback(() => {
            return backupQr(selectedFederation!.name)
        }, [selectedFederation]),
        generateAddress: useCallback(() => {
            return generateAddress(selectedFederation!.name)
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
        generateMnemonic: useCallback(() => {
            return generateMnemonic(selectedFederation!.name)
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
        validateBackupFile: useCallback(
            (file: string) => {
                return validateBackupFile(file, selectedFederation!.name)
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
    fromUser?: string
    toUser?: string
}
type OutgoingGroupMessage = {
    text?: string
    fromUser?: string
    toRoom?: string
}
export const useXmpp = () => {
    const { state } = useCommunityContext()
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
                    console.info(stanza)
                    // Receive a registration response from the server
                    if (
                        stanza.is('presence') &&
                        stanza.getAttr('id') === 'enter-muc-room'
                    ) {
                        xmppClient?.removeListener('stanza', onStanzaReceived)
                        // Make sure the owner of a room send an instant room
                        // configuration query after seeing self-presence
                        console.info(stanza.getChild('x'))
                        if (
                            stanza
                                .getChild('x')
                                ?.getChild('item')
                                ?.getAttr('affiliation') === 'owner' &&
                            stanza
                                .getChild('x')
                                ?.getChild('status')
                                ?.getAttr('code') === '110'
                        ) {
                            console.info('sending instant room')
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
                    }
                }
                xmppClient?.on('stanza', onStanzaReceived)

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
        sendMessage: useCallback(
            async ({ text, toUser }: OutgoingMessage) => {
                await xmppClient?.send(
                    xml(
                        'message',
                        {
                            type: 'chat',
                            to: toUser,
                        },
                        xml('body', { xmlns: 'jabber:client' }, text as string),
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
                            from: fromUser,
                            type: 'groupchat',
                            id: uuid.v4(),
                            to,
                        },
                        xml('body', { xmlns: 'jabber:client' }, text as string),
                    ),
                )
            },
            [xmppClient],
        ),
        sendTestXml: useCallback(async () => {
            const { local, domain, resource } = xmppClient?.jid as JID
            const fromUser = `${local}@${domain}/${resource}`
            await xmppClient?.send(
                xml(
                    'iq',
                    {
                        from: fromUser,
                        id: 'testxml',
                        to: `fedi-general-channel@${XMPP_MUC_DOMAIN}`,
                        type: 'get',
                    },
                    xml('query', {
                        xmlns: 'http://jabber.org/protocol/disco#items',
                        node: 'x-roomuser-item',
                    }),
                ),
            )
            // await xmppClient?.send(
            //     xml(
            //         'iq',
            //         {
            //             from: fromUser,
            //             id: 'testxml',
            //             to: `fedi-general-channel@${XMPP_MUC_DOMAIN}`,
            //             type: 'get',
            //         },
            //         xml('query', {
            //             xmlns: 'http://jabber.org/protocol/disco#items',
            //         }),
            //     ),
            // )
        }, [xmppClient]),
    }
}
