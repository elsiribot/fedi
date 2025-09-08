import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { usePopupFederationInfo } from '@fedi/common/hooks/federation'
import { useToast } from '@fedi/common/hooks/toast'
import { leaveFederation } from '@fedi/common/redux'
import { LoadedFederation } from '@fedi/common/types'
import { getFederationTosUrl } from '@fedi/common/utils/FederationUtils'

import { useAppDispatch } from '../hooks'
import { fedimint } from '../lib/bridge'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'
import { ContentBlock } from './ContentBlock'
import FederationEndedPreview from './FederationEndedPreview'
import * as Layout from './Layout'

type Props = {
    federation: LoadedFederation
}

export const PopupFederationOver: React.FC<Props> = ({ federation }) => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const toast = useToast()
    const popupInfo = usePopupFederationInfo(federation.meta || {})
    const [isLeavingFederation, setIsLeavingFederation] = useState(false)

    if (!federation || !popupInfo) return null

    const handleLeaveFederation = () => {
        setIsLeavingFederation(true)
    }

    const handleConfirmLeaveFederation = async () => {
        if (!federation) return
        try {
            await dispatch(
                leaveFederation({
                    fedimint,
                    federationId: federation.id,
                }),
            )
        } catch (err) {
            toast.error(t, err, 'errors.unknown-error')
            return
        }
        setIsLeavingFederation(false)
    }

    const tosUrl = getFederationTosUrl(federation.meta)

    return (
        <ContentBlock>
            <Layout.Root>
                <Layout.Content centered>
                    <FederationEndedPreview
                        popupInfo={popupInfo}
                        federation={federation}
                    />
                </Layout.Content>
                <Layout.Actions>
                    {tosUrl && (
                        <Button width="full" variant="secondary" href={tosUrl}>
                            {t('phrases.terms-and-conditions')}
                        </Button>
                    )}
                    <Button
                        variant="primary"
                        width="full"
                        onClick={handleLeaveFederation}
                        loading={isLeavingFederation}>
                        {t('feature.federations.leave-federation')}
                    </Button>
                </Layout.Actions>
            </Layout.Root>
            <ConfirmDialog
                open={isLeavingFederation}
                title={t('feature.federations.leave-federation')}
                description={t(
                    'feature.federations.leave-federation-confirmation',
                )}
                onClose={() => setIsLeavingFederation(false)}
                onConfirm={handleConfirmLeaveFederation}
            />
        </ContentBlock>
    )
}
