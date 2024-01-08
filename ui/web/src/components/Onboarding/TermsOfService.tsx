import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { styled, theme } from '../../styles'
import { Button } from '../Button'
import { Text } from '../Text'
import {
    OnboardingActions,
    OnboardingContainer,
    OnboardingContent,
} from './components'

interface TermsOfServiceProps {
    tosUrl: string
    onAccept: () => void | Promise<void>
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({
    tosUrl,
    onAccept,
}: TermsOfServiceProps) => {
    const { t } = useTranslation()
    const [hasTermsLoaded, setHasTermsLoaded] = useState(false)
    const [isAccepting, setIsAccepting] = useState(false)

    const handleAccept = useCallback(async () => {
        setIsAccepting(true)
        await onAccept()
        setIsAccepting(false)
    }, [onAccept]);

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
                    disabled={!hasTermsLoaded || isAccepting}
                    variant="tertiary">
                    {t('feature.onboarding.i-do-not-accept')}
                </Button>
                <Button
                    width="full"
                    onClick={handleAccept}
                    disabled={!hasTermsLoaded}
                loading={isAccepting}>
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
