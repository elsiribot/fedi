import React from 'react'
import { useTranslation } from 'react-i18next'

import { selectActiveFederation } from '@fedi/common/redux'

import { useAppSelector } from '../../hooks'
import { styled } from '../../styles'
import { Avatar } from '../Avatar'
import { Button } from '../Button'
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

    if (!activeFederation) {
        return <Redirect path="/onboarding" />
    }

    return (
        <OnboardingContainer>
            <OnboardingContent>
                <FederationInfoOuter>
                    <FederationInfoInner>
                        <AvatarWrapper>
                            <Avatar
                                shape="hexagon"
                                size="lg"
                                name={activeFederation.name}
                            />
                        </AvatarWrapper>
                        <Text variant="h2" weight="medium">
                            {t('feature.onboarding.welcome-to-federation')}{' '}
                            {activeFederation.name}
                        </Text>
                        <Text variant="caption">
                            {t('feature.onboarding.welcome-instructions')}
                        </Text>
                    </FederationInfoInner>
                </FederationInfoOuter>
            </OnboardingContent>
            <OnboardingActions>
                <Button
                    width="full"
                    variant="tertiary"
                    href="/onboarding/recovery">
                    I am a returning member
                </Button>
                <Button width="full" href="/onboarding/username">
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

const AvatarWrapper = styled('div', {
    marginBottom: 16,
})
