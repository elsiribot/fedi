import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RejectionError } from 'webln'

import { selectActiveFederation } from '@fedi/common/redux'
import { lnurlAuth } from '@fedi/common/utils/lnurl'

import { fedimint } from '../../../bridge'
import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useAppSelector } from '../../../state/hooks'
import { FediMod, ParsedLnurlAuth } from '../../../types'
import CustomOverlay from '../../ui/CustomOverlay'

interface Props {
    fediMod: FediMod
    lnurlAuthRequest?: ParsedLnurlAuth['data'] | null
    onReject: (err: Error) => void
    onAccept: () => void
}

export const AuthOverlay: React.FC<Props> = ({
    fediMod,
    lnurlAuthRequest,
    onReject,
    onAccept,
}) => {
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state
    const federationId = useAppSelector(selectActiveFederation)?.id
    const [isLoading, setIsLoading] = useState(false)

    // Overlay components for LNURL-Auth UX
    const handleAccept = async () => {
        setIsLoading(true)
        try {
            if (!lnurlAuthRequest || !federationId) throw new Error()
            await lnurlAuth(fedimint, federationId, lnurlAuthRequest)
            onAccept()
        } catch (e) {
            toast?.show(t('feature.fedimods.login-failed'), 3000)
        }
        setIsLoading(false)
    }

    const handleReject = () => {
        console.error('Login denied')
        onReject(new RejectionError('words.rejected'))
    }

    return (
        <CustomOverlay
            show={Boolean(lnurlAuthRequest)}
            loading={isLoading}
            onBackdropPress={() =>
                onReject(new RejectionError(t('errors.webln-canceled')))
            }
            contents={{
                title: t('feature.fedimods.login-to'),
                message: fediMod.title,
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
