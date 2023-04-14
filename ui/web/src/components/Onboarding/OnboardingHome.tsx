import React from 'react'
import { useTranslation } from 'react-i18next'

import WorldIllustration from '@fedi/common/assets/images/illustration-world.png'
import FediLogoIcon from '@fedi/common/assets/svgs/fedi-logo-icon.svg'

import { styled, theme } from '../../styles'
import { Button } from '../Button'
import { Icon } from '../Icon'
import { Illustration } from '../Illustration'
import { Text } from '../Text'

export const OnboardingHome: React.FC = () => {
    const { t } = useTranslation()

    return (
        <Container>
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
            <Action>
                <Button width="full" href="/onboarding/join">
                    {t('feature.federations.join-federation')}
                </Button>
                <Terms>
                    <Text variant="small">
                        {t('feature.onboarding.by-clicking-you-agree')}{' '}
                        {/* TODO: Correct EULA link */}
                        <a target="_blank" href="https://fedi.xyz">
                            {t('phrases.user-agreement')}
                        </a>
                    </Text>
                </Terms>
            </Action>
        </Container>
    )
}

const Container = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 48,
    alignItems: 'center',
})

const IllustrationWrapper = styled('div', {
    position: 'relative',
    width: '100%',
    maxWidth: 320,
    height: 'auto',
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
