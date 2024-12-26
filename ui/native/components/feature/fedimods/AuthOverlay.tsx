import { Text } from '@rneui/themed'
import React, { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { RejectionError } from 'webln'

import { useToast } from '@fedi/common/hooks/toast'
import { selectLnurlAuthRequest, selectSiteInfo } from '@fedi/common/redux'
import { lnurlAuth } from '@fedi/common/utils/lnurl'
import { makeLog } from '@fedi/common/utils/log'

import { fedimint } from '../../../bridge'
import { useAppSelector } from '../../../state/hooks'
import CustomOverlay from '../../ui/CustomOverlay'

const log = makeLog('AuthOverlay')

interface Props {
    onReject: (err: Error) => void
    onAccept: () => void
}

export const AuthOverlay: React.FC<Props> = ({ onReject, onAccept }) => {
    const { t } = useTranslation()
    const toast = useToast()
    const lnurlAuthRequest = useAppSelector(selectLnurlAuthRequest)
    const siteInfo = useAppSelector(selectSiteInfo)
    const [isLoading, setIsLoading] = useState(false)

    // Overlay components for LNURL-Auth UX
    const handleAccept = async () => {
        setIsLoading(true)
        try {
            if (!lnurlAuthRequest) throw new Error()
            await lnurlAuth(fedimint, lnurlAuthRequest)
            onAccept()
        } catch (e) {
            log.error('Failed to LNURL auth', e)
            toast.show({
                content: t('feature.fedimods.login-failed'),
                status: 'error',
            })
        }
        setIsLoading(false)
    }

    const handleReject = () => {
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
                icon: 'LockSquareRounded',
                body: (
                    <Text>
                        <Trans
                            t={t}
                            i18nKey="feature.nostr.log-in-to-mod"
                            values={{
                                fediMod: siteInfo?.title,
                                method: t('words.lightning'),
                            }}
                            components={{ bold: <Text caption bold /> }}
                        />
                    </Text>
                ),
                buttons: [
                    {
                        text: t('phrases.go-back'),
                        onPress: handleReject,
                    },
                    {
                        primary: true,
                        text: t('words.continue'),
                        onPress: handleAccept,
                    },
                ],
            }}
        />
    )
}
