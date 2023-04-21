import React from 'react'
import { useTranslation } from 'react-i18next'

import { BitcoinWallet } from '../components/BitcoinWallet'
import { ContentBlock } from '../components/ContentBlock'
import { SiteTiles } from '../components/SiteTiles'
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
                <SiteTiles />
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
