import { xml } from '@xmpp/client'
import { Element } from 'ltx'
import { useCallback, useEffect, useRef } from 'react'
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
import { MSats, Sats } from '../../types'
import lnurlUtils from '../../utils/LNURLUtils'
import { useCommunityContext } from '../contexts/CommunityContext'
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
// This is the XMPP Multi-User-Chat (MUC) domain defined
// in prosody.config.lua on the XMPP server
// https://prosody.im/doc/modules/mod_muc
const XMPP_MUC_DOMAIN = 'xmpp-rooms.dev.fedibtc.com'

export const useXmpp = () => {
    const { state } = useCommunityContext()
    const { xmppClient } = state

    return {
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
    }
}
