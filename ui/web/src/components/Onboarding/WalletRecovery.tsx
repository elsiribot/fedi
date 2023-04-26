import React from 'react'
import { useTranslation } from 'react-i18next'

import SocialPeopleIcon from '@fedi/common/assets/svgs/social-people.svg'
import WordListIcon from '@fedi/common/assets/svgs/word-list.svg'
import { selectActiveFederation } from '@fedi/common/redux'

import { ActionCard } from '../../components/ActionCard'
import { Button } from '../../components/Button'
import { Text } from '../../components/Text'
import { useAppSelector } from '../../hooks'
import { Redirect } from '../Redirect'
import { OnboardingContainer, OnboardingContent } from './components'

export const WalletRecovery: React.FC = () => {
    const { t } = useTranslation()
    const activeFederation = useAppSelector(selectActiveFederation)

    if (!activeFederation) return <Redirect path="/onboarding" />

    return (
        <OnboardingContainer fullWidth>
            <OnboardingContent gap="md">
                <Text variant="h1">{t('feature.recovery.choose-method')}</Text>
                <ActionCard
                    icon={WordListIcon}
                    title={t('feature.recovery.personal-recovery')}
                    description={t(
                        'feature.recovery.personal-recovery-instructions',
                        { federation: activeFederation?.name },
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
                    action={<Button disabled>Coming soon</Button>}
                />
            </OnboardingContent>
        </OnboardingContainer>
    )
}
