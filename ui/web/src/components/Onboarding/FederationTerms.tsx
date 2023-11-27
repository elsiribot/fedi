import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useIsChatSupported } from '@fedi/common/hooks/federation'
import { selectActiveFederation } from '@fedi/common/redux'
import { getFederationTosUrl } from '@fedi/common/utils/FederationUtils'

import { useAppSelector } from '../../hooks'
import { styled, theme } from '../../styles'
import { Button } from '../Button'
import { Redirect } from '../Redirect'
import { Text } from '../Text'
import {
    OnboardingActions,
    OnboardingContainer,
    OnboardingContent,
} from './components'

export const FederationTerms: React.FC = () => {
    const { t } = useTranslation()
    const activeFederation = useAppSelector(selectActiveFederation)
    const isChatSupported = useIsChatSupported()
    const [hasTermsLoaded, setHasTermsLoaded] = useState(false)

    if (!activeFederation) return null

    const tosUrl = getFederationTosUrl(activeFederation.meta)

    if (!tosUrl) {
        return <Redirect path="/onboarding/welcome" />
    }

    return (
        <OnboardingContainer>
            <OnboardingContent fullWidth>
                <Text variant="h2" weight="medium" css={{ marginBottom: 16 }}>
                    {t('feature.onboarding.terms-and-conditions')}
                </Text>
                <FederationTermsIframe
                    src={tosUrl}
                    onLoad={() => setHasTermsLoaded(true)}
                />
            </OnboardingContent>
            <OnboardingActions>
                <Button
                    width="full"
                    href="/onboarding/welcome"
                    disabled={!hasTermsLoaded}
                    variant="tertiary">
                    {t('feature.onboarding.i-do-not-accept')}
                </Button>
                <Button
                    width="full"
                    href={isChatSupported ? '/onboarding/username' : '/'}
                    disabled={!hasTermsLoaded}>
                    {t('feature.onboarding.i-accept')}
                </Button>
            </OnboardingActions>
        </OnboardingContainer>
    )
}

const FederationTermsIframe = styled('iframe', {
    borderRadius: 8,
    width: '100%',
    height: 480,
    border: `1px solid ${theme.colors.lightGrey}`,
    overflow: 'auto',
})
