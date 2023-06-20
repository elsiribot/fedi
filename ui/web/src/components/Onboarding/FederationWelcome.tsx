import React from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { useIsChatSupported } from '@fedi/common/hooks/federation'
import { selectActiveFederation } from '@fedi/common/redux'

import { useAppSelector } from '../../hooks'
import { styled, theme } from '../../styles'
import { Button } from '../Button'
import { FederationAvatar } from '../FederationAvatar'
import { Redirect } from '../Redirect'
import { Text } from '../Text'
import {
    OnboardingActions,
    OnboardingContainer,
    OnboardingContent,
} from './components'

export const FederationWelcome: React.FC = () => {
    const { t } = useTranslation()
    const activeFederation = useAppSelector(selectActiveFederation)
    const isChatSupported = useIsChatSupported()

    if (!activeFederation) {
        return <Redirect path="/onboarding" />
    }

    return (
        <OnboardingContainer>
            <OnboardingContent>
                <FederationInfoOuter>
                    <FederationInfoInner>
                        <AvatarWrapper>
                            <FederationAvatar
                                federation={activeFederation}
                                size="lg"
                            />
                        </AvatarWrapper>
                        <Text variant="h2" weight="medium">
                            {t('feature.onboarding.welcome-to-federation')}{' '}
                            {activeFederation.name}
                        </Text>
                        {activeFederation.meta?.welcome_message ? (
                            <CustomWelcomeMessage>
                                <Trans components={{ bold: <strong /> }}>
                                    {activeFederation.meta.welcome_message}
                                </Trans>
                            </CustomWelcomeMessage>
                        ) : (
                            <Text variant="caption">
                                {t('feature.onboarding.welcome-instructions')}
                            </Text>
                        )}
                    </FederationInfoInner>
                </FederationInfoOuter>
            </OnboardingContent>
            <OnboardingActions>
                <Button
                    width="full"
                    variant="tertiary"
                    href="/onboarding/recover">
                    I am a returning member
                </Button>
                <Button
                    width="full"
                    href={isChatSupported ? '/onboarding/username' : '/'}>
                    Join as a new member
                </Button>
            </OnboardingActions>
        </OnboardingContainer>
    )
}

const outerRadius = 20
const outerPadding = 2
const FederationInfoOuter = styled('div', {
    padding: outerPadding,
    borderRadius: outerRadius,
    holoGradient: '900',
})

const FederationInfoInner = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    padding: 24,
    background: '#FFF',
    borderRadius: outerRadius - outerPadding,
})

const CustomWelcomeMessage = styled('div', {
    holoGradient: '400',
    padding: 16,
    borderRadius: 16,
    textAlign: 'center',
    fontSize: theme.fontSizes.caption,
    lineHeight: '20px',
})

const AvatarWrapper = styled('div', {
    marginBottom: 16,
})
