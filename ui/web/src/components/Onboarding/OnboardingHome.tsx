import React from 'react'
import { useTranslation } from 'react-i18next'

import WorldIllustration from '@fedi/common/assets/images/illustration-world.png'
import FediLogoIcon from '@fedi/common/assets/svgs/fedi-logo-icon.svg'

import { styled, theme } from '../../styles'
import { Button } from '../Button'
import { Icon } from '../Icon'
import { Illustration } from '../Illustration'
import { Text } from '../Text'
import {
    OnboardingActions,
    OnboardingContainer,
    OnboardingContent,
} from './components'

export const OnboardingHome: React.FC = () => {
    const { t } = useTranslation()

    return (
        <OnboardingContainer>
            <OnboardingContent>
                <IllustrationWrapper>
                    <Illustration
                        src={WorldIllustration}
                        alt=""
                        width={320}
                        height={320}
                    />
                </IllustrationWrapper>
                <Info>
                    <Icon size="lg" icon={FediLogoIcon} />
                    <Text variant="h2" weight="medium">
                        {t('feature.onboarding.welcome-to-fedi')}
                    </Text>
                    <Text>{t('feature.onboarding.chat-earn-save-spend')}</Text>
                </Info>
            </OnboardingContent>
            <OnboardingActions>
                <Button width="full" href="/onboarding/join">
                    {t('feature.federations.join-federation')}
                </Button>
                <Terms>
                    <Text variant="small">
                        {t('feature.onboarding.by-clicking-you-agree')}{' '}
                        <a target="_blank" href="https://www.fedi.xyz/eula-en">
                            {t('phrases.user-agreement')}
                        </a>
                    </Text>
                </Terms>
            </OnboardingActions>
        </OnboardingContainer>
    )
}

const IllustrationWrapper = styled('div', {
    position: 'relative',
    width: '100%',
    maxWidth: 320,
    height: 'auto',
    marginBottom: 24,
})

const Info = styled('div', {
    maxWidth: 320,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
})

const Action = styled('div', {
    maxWidth: 320,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
})

const Terms = styled('div', {
    maxWidth: 220,

    '& a': {
        color: theme.colors.blue,
    },
})
