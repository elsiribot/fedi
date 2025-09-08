import { useTranslation } from 'react-i18next'

import { ContentBlock } from '../components/ContentBlock'
import { FediModTiles } from '../components/FediModTiles'
import * as Layout from '../components/Layout'
import MainHeaderButtons from '../components/MainHeaderButtons'
import { styled } from '../styles'

export default function ModsPage() {
    const { t } = useTranslation()

    return (
        <ContentBlock>
            <Layout.Root>
                <ModsHeader>
                    <Layout.Title>{t('phrases.mini-apps')}</Layout.Title>
                    {/* TODO: link to add mods page with onAddPress prop when adding mods is implemented */}
                    <MainHeaderButtons />
                </ModsHeader>
                <Layout.Content>
                    <Content>
                        <FediModTiles />
                    </Content>
                </Layout.Content>
            </Layout.Root>
        </ContentBlock>
    )
}

const Content = styled('div', {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    justifyContent: 'flex-start',
    padding: '20px 16px 16px',
    textAlign: 'center',
})

const ModsHeader = styled(Layout.Header, {
    padding: '8px 16px',

    '@sm': {
        padding: '22px 16px 16px',
    },
})
