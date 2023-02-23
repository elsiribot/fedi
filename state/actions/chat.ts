import { Client } from '@xmpp/client'
import { Element } from 'ltx'

import { XMPP_MUC_DOMAIN } from '../../constants'
import i18n from '../../localization/i18n'
import { Group } from '../../types'
import xmlUtils from '../../utils/XmlUtils'
import { Action as ChatAction, updateGroup } from '../contexts/ChatContext'

export const changeMucRoomName = (
    group: Group,
    updatedName: string,
    dispatch: React.Dispatch<ChatAction>,
    xmppClient: Client | null,
): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        if (!xmppClient?.jid) reject(i18n.t('errors.unknown-error'))

        try {
            const roomConfigQueryXml = xmlUtils.generateRoomConfigQuery(
                updatedName,
                xmppClient!.jid!.toString(),
                `${group.id}@${XMPP_MUC_DOMAIN}`,
            )
            const onStanzaReceived = async (stanza: Element) => {
                // Listen for matching stanza from the server and remove the
                // listener when we get a response
                if (stanza.getAttr('id') === 'set-room-config') {
                    xmppClient?.removeListener('stanza', onStanzaReceived)
                    if (stanza.getAttr('type') === 'error') {
                        reject(
                            i18n.t('errors.only-group-owners-can-change-name'),
                        )
                    } else if (stanza.getAttr('type') === 'result') {
                        dispatch(
                            updateGroup(
                                new Group({
                                    ...group,
                                    name: updatedName,
                                }),
                            ),
                        )
                    }
                    resolve(true)
                }
            }
            xmppClient?.on('stanza', onStanzaReceived)
            xmppClient?.send(roomConfigQueryXml)
        } catch (error) {
            console.error('changeMucRoomName', error)
        }
    })
}
