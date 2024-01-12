import React from 'react'
import { useTranslation } from 'react-i18next'

import { styled } from '../../styles'
import { Button } from '../Button'
import * as Layout from '../Layout'
import { Text } from '../Text'

interface Props {
    next(): void
}

export const SocialBackupIntro: React.FC<Props> = ({ next }) => {
    const { t } = useTranslation()
    return (
        <>
            <Layout.Content>
                <Content>
                    <Text>
                        {t('feature.backup.start-social-backup-instructions')}
                    </Text>
                </Content>
            </Layout.Content>
            <Layout.Actions>
                <Button width="full" onClick={next}>
                    {t('words.next')}
                </Button>
            </Layout.Actions>
        </>
    )
}

const Content = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
})
