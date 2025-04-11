import Image from 'next/image'
import { useTranslation } from 'react-i18next'

import AwesomeFedimint from '@fedi/common/assets/images/awesome-fedimint.png'
import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import { selectFederations } from '@fedi/common/redux'

import { BitcoinWallet } from '../components/BitcoinWallet'
import { ContentBlock } from '../components/ContentBlock'
import { FediModTiles } from '../components/FediModTiles'
import * as Layout from '../components/Layout'
import PublicFederations from '../components/PublicFederations'
import { Text } from '../components/Text'
import { useAppSelector } from '../hooks'
import { styled } from '../styles'

function HomePage() {
    const { t } = useTranslation()
    const federations = useAppSelector(selectFederations)

    const hasFederations = federations.length > 0

    return (
        <ContentBlock>
            <Layout.Root>
                <Layout.Header>
                    <Layout.Title>{t('words.home')}</Layout.Title>
                </Layout.Header>
                <Layout.Content>
                    <Content>
                        <IllustrationWrapper>
                            <Image
                                src={AwesomeFedimint}
                                alt=""
                                width={200}
                                height={200}
                            />
                        </IllustrationWrapper>
                        <IntroTextWrapper>
                            <Text variant="h2" weight="medium">
                                {t('feature.community.join-a-community')}
                            </Text>
                            <Text>
                                {t('feature.community.join-community-guidance')}
                            </Text>
                        </IntroTextWrapper>
                        {hasFederations ? (
                            <>
                                <BitcoinWallet />
                                <ErrorBoundary fallback={null}>
                                    <FediModTiles />
                                </ErrorBoundary>
                            </>
                        ) : (
                            <PublicFederations />
                        )}
                    </Content>
                </Layout.Content>
            </Layout.Root>
        </ContentBlock>
    )
}

const Content = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
})

const IllustrationWrapper = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    padding: 16,
})

const IntroTextWrapper = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    textAlign: 'center',
})

export default HomePage
