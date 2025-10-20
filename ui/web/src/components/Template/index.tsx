import { useRouter } from 'next/router'
import React from 'react'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import {
    selectMatrixStatus,
    selectLastSelectedCommunity,
} from '@fedi/common/redux'
import { MatrixSyncStatus } from '@fedi/common/types'

import { useAppSelector } from '../../hooks'
import { styled, theme } from '../../styles'
import { shouldHideNavigation } from '../../utils/nav'
import { ChatOfflineIndicator } from '../Chat/ChatOfflineIndicator'
import { CommunitySelector } from '../CommunitySelector'
import MainHeaderButtons from '../MainHeaderButtons'
import { PageError } from '../PageError'
import SelectedCommunity from '../SelectedCommunity'
import { Navigation } from './Navigation'

interface Props {
    children: React.ReactNode
}

export const Template: React.FC<Props> = ({ children }) => {
    const router = useRouter()
    const { asPath } = router
    const syncStatus = useAppSelector(selectMatrixStatus)
    const selectedCommunity = useAppSelector(selectLastSelectedCommunity)

    const hideNavigation = shouldHideNavigation(asPath)

    const shouldShowChatOffline =
        syncStatus === MatrixSyncStatus.syncing && asPath.startsWith('/chat')

    const isHome = asPath === '/home'

    const goToJoinCommunity = () => {
        router.push('/onboarding/communities')
    }

    return (
        <Container>
            <Content>
                <HeaderArea>
                    {isHome && (
                        <HomeHeader>
                            <HeaderRow>
                                <CommunitySelectorWrapper>
                                    <CommunitySelector />
                                </CommunitySelectorWrapper>
                                <MainHeaderButtons
                                    onAddPress={goToJoinCommunity}
                                />
                            </HeaderRow>
                            {selectedCommunity && (
                                <SelectedCommunity
                                    community={selectedCommunity}
                                />
                            )}
                        </HomeHeader>
                    )}
                </HeaderArea>

                {shouldShowChatOffline && <ChatOfflineIndicator />}

                <ErrorBoundary fallback={() => <PageError />}>
                    {children}
                </ErrorBoundary>

                {!hideNavigation && <Navigation />}
            </Content>
        </Container>
    )
}

const Container = styled('div', {
    overflow: 'hidden',
    width: '100%',
})

const Content = styled('div', {
    background: theme.colors.white,
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    margin: '0 auto',
    minHeight: 0,
    maxWidth: 480,
})

const HeaderArea = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    padding: 0,
})

const HomeHeader = styled('div', {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    fediGradient: 'sky',
    maxWidth: 600,
    gap: theme.spacing.sm,
    padding: '0 16px',
    width: '100%',
})

const HeaderRow = styled('div', {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
})

const CommunitySelectorWrapper = styled('div', {
    padding: '16px 0',
})
