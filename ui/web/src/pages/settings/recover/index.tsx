import React from 'react'
import { useTranslation } from 'react-i18next'

import SocialPeopleIcon from '@fedi/common/assets/svgs/social-people.svg'
import WordListIcon from '@fedi/common/assets/svgs/word-list.svg'
import { selectActiveFederation } from '@fedi/common/redux'

import { ActionCard } from '../../../components/ActionCard'
import { Button } from '../../../components/Button'
import { ContentBlock } from '../../../components/ContentBlock'
import * as Layout from '../../../components/Layout'
import { useAppSelector } from '../../../hooks'
import { styled } from '../../../styles'

function RecoverPage() {
    const { t } = useTranslation()
    const activeFederation = useAppSelector(selectActiveFederation)
    return (
        <ContentBlock>
            <Layout.Root>
                <Layout.Header>
                    <Layout.Title>
                        {t('feature.recovery.choose-method')}
                    </Layout.Title>
                </Layout.Header>
                <Layout.Content>
                    <ActionCards>
                        <ActionCard
                            icon={WordListIcon}
                            title={t('feature.recovery.personal-recovery')}
                            description={t(
                                'feature.recovery.personal-recovery-instructions',
                                { federation: activeFederation?.name },
                            )}
                            action={
                                <Button href="/settings/recover/personal">
                                    {t(
                                        'feature.recovery.start-personal-recovery',
                                    )}
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
                    </ActionCards>
                </Layout.Content>
            </Layout.Root>
        </ContentBlock>
    )
}

const ActionCards = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
})

export default RecoverPage
