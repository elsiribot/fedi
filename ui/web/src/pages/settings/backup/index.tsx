import React from 'react'
import { useTranslation } from 'react-i18next'

import SocialPeopleIcon from '@fedi/common/assets/svgs/social-people.svg'
import WordListIcon from '@fedi/common/assets/svgs/word-list.svg'

import { ActionCard } from '../../../components/ActionCard'
import { Button } from '../../../components/Button'
import { ContentBlock } from '../../../components/ContentBlock'
import * as Layout from '../../../components/Layout'
import { styled } from '../../../styles'

function BackupPage() {
    const { t } = useTranslation()
    return (
        <ContentBlock>
            <Layout.Root>
                <Layout.Header>
                    <Layout.Title>
                        {t('feature.backup.choose-method')}
                    </Layout.Title>
                </Layout.Header>
                <Layout.Content>
                    <ActionCards>
                        <ActionCard
                            icon={WordListIcon}
                            title={t('feature.backup.personal-backup')}
                            description={t(
                                'feature.backup.personal-backup-instructions',
                            )}
                            action={
                                <Button href="/settings/backup/personal">
                                    {t('feature.backup.start-personal-backup')}
                                </Button>
                            }
                        />
                        <ActionCard
                            icon={SocialPeopleIcon}
                            title={t('feature.backup.social-backup')}
                            description={t(
                                'feature.backup.social-backup-instructions',
                            )}
                            action={
                                <Button href="/settings/backup/social">
                                    {t('feature.backup.start-social-backup')}
                                </Button>
                            }
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
})

export default BackupPage
