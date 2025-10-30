import { useRouter } from 'next/router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../components/Button'
import { ContentBlock } from '../components/ContentBlock'
import * as Layout from '../components/Layout'
import { Redirect } from '../components/Redirect'
import { Text } from '../components/Text'
import { styled, theme } from '../styles'
import { getHashParams } from '../utils/linking'

function AccountDeletionPage() {
    const { t } = useTranslation()
    const router = useRouter()
    const [confirmed, setConfirmed] = useState(false)
    const params = getHashParams(router.asPath)
    const userId = params.id || null

    const handleConfirm = () => {
        setConfirmed(true)
    }

    // Error state: no user ID provided
    if (userId === null) {
        return <Redirect path="/" />
    }

    // Success state: confirmed
    if (confirmed) {
        return (
            <ContentBlock>
                <Layout.Root>
                    <Layout.Content centered fadeIn>
                        <ContentInner>
                            <Text variant="h2" weight="medium">
                                {t('feature.settings.account-deletion')}
                            </Text>
                            <Text
                                variant="body"
                                css={{ color: theme.colors.darkGrey }}>
                                {t('feature.settings.account-deletion-success')}
                            </Text>
                        </ContentInner>
                    </Layout.Content>
                </Layout.Root>
            </ContentBlock>
        )
    }

    // Main state: show explanation and confirmation button
    return (
        <ContentBlock>
            <Layout.Root>
                <Layout.Content centered fadeIn>
                    <ContentInner>
                        <Text variant="h2" weight="medium">
                            {t('feature.settings.account-deletion')}
                        </Text>
                        <Text
                            variant="body"
                            css={{ color: theme.colors.darkGrey }}>
                            {t('feature.settings.account-deletion-explanation')}
                        </Text>
                    </ContentInner>
                </Layout.Content>
                <Layout.Actions>
                    <Button
                        width="full"
                        variant="danger"
                        onClick={handleConfirm}>
                        {t('feature.settings.confirm-account-deletion')}
                    </Button>
                </Layout.Actions>
            </Layout.Root>
        </ContentBlock>
    )
}

const ContentInner = styled('div', {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    maxWidth: '90%',
    margin: '32px auto',
    textAlign: 'center',
    width: '100%',
})

export default AccountDeletionPage
