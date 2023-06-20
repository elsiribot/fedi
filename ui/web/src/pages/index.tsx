import React from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'

import { BitcoinWallet } from '../components/BitcoinWallet'
import { ContentBlock } from '../components/ContentBlock'
import { FediModTiles } from '../components/FediModTiles'
import { Text } from '../components/Text'
import { styled } from '../styles'

function HomePage() {
    const { t } = useTranslation()

    return (
        <ContentBlock>
            <Title>
                <Text variant="h1">{t('words.home')}</Text>
            </Title>
            <ContentInner>
                <BitcoinWallet />
                <ErrorBoundary fallback={null}>
                    <FediModTiles />
                </ErrorBoundary>
            </ContentInner>
        </ContentBlock>
    )
}

const Title = styled('div', {
    marginBottom: 16,
})

const ContentInner = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
})

export default HomePage
