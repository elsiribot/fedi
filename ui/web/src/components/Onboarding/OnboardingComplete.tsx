import React from 'react'
import { useTranslation } from 'react-i18next'

import { styled } from '../../styles'
import { Avatar } from '../Avatar'
import { Button } from '../Button'
import { Text } from '../Text'
import {
    OnboardingActions,
    OnboardingContainer,
    OnboardingContent,
} from './components'

export const OnboardingComplete: React.FC = () => {
    const { t } = useTranslation()
    const username = 'Fediman'

    return (
        <OnboardingContainer>
            <OnboardingContent>
                <AvatarWrapper>
                    <Avatar name={username} size="lg" />
                </AvatarWrapper>
                <Text variant="h2" weight="medium">
                    {t('feature.onboarding.nice-to-meet-you', {
                        username,
                    })}
                </Text>
                <Text>{t('feature.onboarding.greeting-instructions')}</Text>
            </OnboardingContent>
            <OnboardingActions>
                <Button width="full" href="/">
                    {t('feature.onboarding.continue-to-fedi')}
                </Button>
            </OnboardingActions>
        </OnboardingContainer>
    )
}

const AvatarWrapper = styled('div', {
    marginBottom: 8,
})
