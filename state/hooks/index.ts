import { xml } from '@xmpp/client'
import { JID } from '@xmpp/jid'
import { Element } from 'ltx'
import { useCallback, useEffect, useRef } from 'react'
import {
    addressOrInvoice,
    approveSocialRecoveryRequest,
    authenticateGuardian,
    backupXmppUsername,
    completeSocialRecovery,
    denySocialRecoveryRequest,
    generateAddress,
    generateEcash,
    generateInvoice,
    getMnemonic,
    getXmppCredentials,
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
import { Group, Member, Message, MSats, Sats } from '../../types'
import amountUtils from '../../utils/AmountUtils'
import lnurlUtils from '../../utils/LNURLUtils'
import { addToGroups, useCommunityContext } from '../contexts/CommunityContext'
import { useCurrencyContext } from '../contexts/CurrencyContext'
import { useFederationsContext } from '../contexts/FederationsContext'

export const usePrevious = <T extends unknown>(value: T): T | undefined => {
    const ref = useRef<T>()
    useEffect(() => {
        ref.current = value
    })
    return ref.current
}

export const useBtcUsdPrice = () => {
    const { state } = useCurrencyContext()
    const { btcUsdPrice } = state
    return {
        convertSatsToUsd: useCallback(
            (sats: Sats) => {
                return amountUtils.satToUsd(sats, btcUsdPrice)
            },
            [btcUsdPrice],
        ),
        convertSatsToUsdString: useCallback(
            (sats: Sats) => {
                return amountUtils.satToUsdString(sats, btcUsdPrice)
            },
            [btcUsdPrice],
        ),
    }
}

export const useBridge = () => {
    const { state } = useFederationsContext()
    const { selectedFederationId } = state

    return {
        addressOrInvoice: useCallback(
            (input: string) => {
                return addressOrInvoice(input, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        approveSocialRecoveryRequest: useCallback(
            (recoveryId: string) => {
                return approveSocialRecoveryRequest(
                    recoveryId,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        authenticateGuardian: useCallback(
            (secret: string) => {
                return authenticateGuardian(secret, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        recoveryQr: useCallback(() => {
            return recoveryQr(selectedFederationId!)
        }, [selectedFederationId]),
        leaveFederation: useCallback(() => {
            return leaveFederation(selectedFederationId!)
        }, [selectedFederationId]),
        generateAddress: useCallback(() => {
            return generateAddress(selectedFederationId!)
        }, [selectedFederationId]),
        socialRecoveryApprovals: useCallback(() => {
            return socialRecoveryApprovals(selectedFederationId!)
        }, [selectedFederationId]),
        generateEcash: useCallback(
            (amount: MSats) => {
                return generateEcash(amount, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        generateInvoice: useCallback(
            (amount: MSats, description: string) => {
                return generateInvoice(
                    amount,
                    description,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        getMnemonic: useCallback(() => {
            return getMnemonic(selectedFederationId!)
        }, [selectedFederationId]),
        listTransactions: useCallback(() => {
            return listTransactions(selectedFederationId!)
        }, [selectedFederationId]),
        lnurlSignMessage: useCallback(
            (url: string) => {
                return lnurlSignMessage(url, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        lnurlGetToken: useCallback(
            (lnurl: string) => {
                return lnurlUtils.getToken(lnurl, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        updateTransactionNotes: useCallback(
            (transactionId: string, notes: string) => {
                return updateTransactionNotes(
                    transactionId,
                    notes,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        listGateways: useCallback(() => {
            return listGateways(selectedFederationId!)
        }, [selectedFederationId]),
        switchGateway: useCallback(
            (gateway: LightningGateway) => {
                return switchGateway(gateway, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        locateRecoveryFile: useCallback(() => {
            return locateRecoveryFile(selectedFederationId!)
        }, [selectedFederationId]),
        completeSocialRecovery: useCallback(() => {
            return completeSocialRecovery(selectedFederationId!)
        }, [selectedFederationId]),
        payInvoice: useCallback(
            (invoice: string) => {
                return payInvoice(invoice, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        payAddress: useCallback(
            (address: string, sats: Sats) => {
                return payAddress(address, sats, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        receiveEcash: useCallback(
            (ecash: string) => {
                return receiveEcash(ecash, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        recoverFromMnemonic: useCallback(
            (mnemonic: string[]) => {
                return recoverFromMnemonic(mnemonic, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        denySocialRecoveryRequest: useCallback(
            (userPublicKey: string) => {
                return denySocialRecoveryRequest(
                    userPublicKey,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        socialRecoveryDownloadVerificationDoc: useCallback(
            (recoveryId: string) => {
                return socialRecoveryDownloadVerificationDoc(
                    recoveryId,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        validateRecoveryFile: useCallback(
            (file: string) => {
                return validateRecoveryFile(file, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        validateEcash: useCallback(
            (ecash: string) => {
                return validateEcash(ecash, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        uploadBackupFile: useCallback(
            (videoFilePath: string) => {
                return uploadBackupFile(videoFilePath, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        getXmppCredentials: useCallback(() => {
            return getXmppCredentials(selectedFederationId!)
        }, [selectedFederationId]),
        backupXmppUsername: useCallback(
            (username: string) => {
                return backupXmppUsername(username, selectedFederationId!)
            },
            [selectedFederationId],
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
    message: Message
    toRoom: string
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
            (group: Group) => {
                if (!xmppClient?.jid) return
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
                                xmppClient?.send(
                                    xml(
                                        'iq',
                                        {
                                            from: fromUser,
                                            to: `${group.id}@${XMPP_MUC_DOMAIN}`,
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
                                dispatch(addToGroups(group))
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
                try {
                    xmppClient?.send(
                        xml(
                            'presence',
                            {
                                from: fromUser,
                                to: `${group.id}@${XMPP_MUC_DOMAIN}/${local}`,
                                id: 'enter-muc-room',
                            },
                            xml('x', {
                                xmlns: 'http://jabber.org/protocol/muc',
                            }),
                        ),
                    )
                } catch (error) {
                    console.error('enterMucRoom error', error)
                }
            },
            [dispatch, xmppClient],
        ),
        fetchMessagesFromArchive: useCallback(
            ({ filters }: MessageArchiveQuery) => {
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
                try {
                    xmppClient?.send(
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
                } catch (error) {
                    console.error('sendDirectMessage error', error)
                }
            },
            [xmppClient],
        ),
        getUniqueGroupId: useCallback((): Promise<string> => {
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

                xmppClient
                    ?.send(
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
                    .catch(console.error)
            })
        }, [xmppClient]),
        sendUpdatedPaymentMessage: useCallback(
            ({ message, to }: OutgoingMessage) => {
                const fromJid = xmppClient?.jid?.toString()
                const toJid = to?.jid.toString()
                try {
                    xmppClient?.send(
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
                } catch (error) {
                    console.error('sendUpdatedPaymentMessage error', error)
                }
            },
            [xmppClient],
        ),
        sendDirectMessage: useCallback(
            ({ message, to }: OutgoingMessage) => {
                const fromJid = xmppClient?.jid?.toString()
                const toJid = to?.jid.toString()

                try {
                    xmppClient?.send(
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
                } catch (error) {
                    console.error('sendDirectMessage error', error)
                }
            },
            [xmppClient],
        ),
        sendGroupMessage: useCallback(
            ({ message, toRoom }: OutgoingGroupMessage) => {
                const fromJid = xmppClient?.jid?.toString()
                const to = `${toRoom}@${XMPP_MUC_DOMAIN}`
                try {
                    xmppClient?.send(
                        xml(
                            'message',
                            {
                                id: message.id,
                                from: fromJid,
                                type: 'groupchat',
                                to,
                            },
                            xml(
                                'body',
                                { xmlns: 'jabber:client' },
                                message.content as string,
                            ),
                            xml(
                                'gm',
                                { xmlns: 'fedi:group-message' },
                                JSON.stringify(message),
                            ),
                        ),
                    )
                } catch (error) {
                    console.error('sendGroupMessage error', error)
                }
            },
            [xmppClient],
        ),
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
