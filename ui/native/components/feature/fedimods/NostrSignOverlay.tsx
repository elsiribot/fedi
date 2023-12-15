import { Text, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RejectionError } from 'webln'

import { selectActiveFederationId } from '@fedi/common/redux'
import { makeLog } from '@fedi/common/utils/log'
import { getNostrEventDisplay } from '@fedi/common/utils/nostr'
import {
    SignedNostrEvent,
    UnsignedNostrEvent,
} from '@fedi/injections/src/injectables/nostr/types'
import { eventHashFromEvent } from '@fedi/injections/src/injectables/nostr/utils'

import { fedimint } from '../../../bridge'
import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useAppSelector } from '../../../state/hooks'
import { FediMod } from '../../../types'
import CustomOverlay from '../../ui/CustomOverlay'

const log = makeLog('AuthOverlay')

interface Props {
    fediMod: FediMod
    nostrEvent?: UnsignedNostrEvent | null
    onReject: (err: Error) => void
    onAccept: (signedEvent: SignedNostrEvent) => void
}

export const NostrSignOverlay: React.FC<Props> = ({
    fediMod,
    nostrEvent,
    onReject,
    onAccept,
}) => {
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state
    const { theme } = useTheme()
    const federationId = useAppSelector(selectActiveFederationId)
    const [isLoading, setIsLoading] = useState(false)

    const handleAccept = async () => {
        log.info('Signature approved')
        setIsLoading(true)
        try {
            if (!nostrEvent || !federationId) throw new Error()
            const pubkey = await fedimint.getNostrPubKey(federationId)
            const id = eventHashFromEvent(pubkey, nostrEvent)
            let result = await fedimint.signNostrEvent(id, federationId)
            onAccept({
                id,
                pubkey,
                created_at: nostrEvent.created_at,
                kind: nostrEvent.kind,
                content: nostrEvent.content,
                tags: nostrEvent.tags,
                sig: result,
            })
        } catch (e) {
            log.error('Failed to sign Nostr event', e)
            toast?.show(t('feature.fedimods.login-failed'), 3000)
        }
        setIsLoading(false)
    }

    const handleReject = () => {
        onReject(new RejectionError('words.rejected'))
    }

    const display = nostrEvent ? getNostrEventDisplay(nostrEvent, t) : undefined

    return (
        <CustomOverlay
            show={Boolean(nostrEvent)}
            loading={isLoading}
            onBackdropPress={() =>
                onReject(new RejectionError(t('errors.webln-canceled')))
            }
            contents={{
                title: t('feature.nostr.wants-you-to-sign', {
                    fediMod: fediMod.title,
                }),
                message: display?.kind || '',
                body: display?.content ? (
                    <Text
                        caption
                        style={{
                            paddingTop: theme.spacing.lg,
                            paddingBottom: theme.spacing.sm,
                            paddingHorizontal: theme.spacing.sm,
                            color: theme.colors.grey,
                            textAlign: 'center',
                        }}
                        numberOfLines={3}>
                        "{display.content}"
                    </Text>
                ) : undefined,
                buttons: [
                    {
                        text: t('words.no'),
                        onPress: handleReject,
                    },
                    {
                        primary: true,
                        text: t('words.yes'),
                        onPress: handleAccept,
                    },
                ],
            }}
        />
    )
}
