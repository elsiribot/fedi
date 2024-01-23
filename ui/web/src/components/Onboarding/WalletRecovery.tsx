import React from 'react'
import { useTranslation } from 'react-i18next'

import SocialPeopleIcon from '@fedi/common/assets/svgs/social-people.svg'
import WordListIcon from '@fedi/common/assets/svgs/word-list.svg'

import { ActionCard } from '../../components/ActionCard'
import { Button } from '../../components/Button'
import { Text } from '../../components/Text'
import { styled } from '../../styles'
import { OnboardingContainer, OnboardingContent } from './components'

export const WalletRecovery: React.FC = () => {
    const { t } = useTranslation()

    return (
        <OnboardingContainer>
            <OnboardingContent gap="md" fullWidth>
                <Text variant="h1">{t('feature.recovery.choose-method')}</Text>
                <Cards>
                    <ActionCard
                        icon={WordListIcon}
                        title={t('feature.recovery.personal-recovery')}
                        description={t(
                            'feature.recovery.personal-recovery-instructions',
                        )}
                        action={
                            <Button href="/onboarding/recover/personal">
                                {t('feature.recovery.start-personal-recovery')}
                            </Button>
                        }
                    />
                    <ActionCard
                        icon={SocialPeopleIcon}
                        title={t('feature.recovery.social-recovery')}
                        description={t(
                            'feature.recovery.social-recovery-instructions',
                        )}
                        action={
                            <Button href="/onboarding/recover/social">
                                {t('feature.recovery.start-social-recovery')}
                            </Button>
                        }
                    />
                </Cards>
            </OnboardingContent>
        </OnboardingContainer>
    )
}

const Cards = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 360,
    gap: 16,
})
