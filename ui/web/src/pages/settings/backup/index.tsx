import React from 'react'
import { useTranslation } from 'react-i18next'

import SocialPeopleIcon from '@fedi/common/assets/svgs/social-people.svg'
import WordListIcon from '@fedi/common/assets/svgs/word-list.svg'

import { ActionCard } from '../../../components/ActionCard'
import { Button } from '../../../components/Button'
import { ContentBlock } from '../../../components/ContentBlock'
import { Text } from '../../../components/Text'
import { styled } from '../../../styles'

function BackupPage() {
    const { t } = useTranslation()
    return (
        <ContentBlock>
            <Text variant="h1">{t('feature.backup.choose-method')}</Text>
            <ActionCards>
                <ActionCard
                    icon={WordListIcon}
                    title={t('feature.backup.personal-backup')}
                    description={t(
                        'feature.backup.personal-backup-instructions',
                    )}
                    action={
                        <Button href="/admin/backup/personal">
                            {t('feature.backup.start-personal-backup')}
                        </Button>
                    }
                />
                <ActionCard
                    icon={SocialPeopleIcon}
                    title={t('feature.backup.social-backup')}
                    description={t('feature.backup.social-backup-instructions')}
                    action={<Button disabled>Coming soon</Button>}
                />
            </ActionCards>
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

export default BackupPage
