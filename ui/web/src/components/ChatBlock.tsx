import React from 'react'
import { useTranslation } from 'react-i18next'

import ErrorIcon from '@fedi/common/assets/svgs/error.svg'
import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import { selectOrderedChatList } from '@fedi/common/redux'

import { useAppSelector, useMediaQuery } from '../hooks'
import { config, styled, theme } from '../styles'
import { Button } from './Button'
import { ChatListItem } from './ChatListItem'
import { ContentBlock } from './ContentBlock'
import { Icon } from './Icon'
import { ShadowScroller } from './ShadowScroller'
import { Text } from './Text'

interface Props {
    children: React.ReactNode
    isShowingContent: boolean
}

export const ChatBlock: React.FC<Props> = ({ children, isShowingContent }) => {
    const { t } = useTranslation()
    const chats = useAppSelector(selectOrderedChatList)
    const isSmall = useMediaQuery(config.media.sm)

    return (
        <ContentBlock css={{ maxWidth: 840, padding: 0 }}>
            <Layout>
                <Sidebar isHidden={isShowingContent}>
                    <SidebarHeader>
                        <Text variant={isSmall ? 'h1' : 'h2'}>
                            {t('words.chat')}
                        </Text>
                        <Button size="sm" variant="outline" href="/chat/new">
                            {t('feature.chat.new-chat')}
                        </Button>
                    </SidebarHeader>
                    <SidebarList>
                        {chats.map(chat => (
                            <ErrorBoundary key={chat.id} fallback={null}>
                                <ChatListItem chat={chat} />
                            </ErrorBoundary>
                        ))}
                    </SidebarList>
                </Sidebar>
                <Content isShowing={isShowingContent}>
                    <ErrorBoundary
                        fallback={
                            <Error>
                                <Icon icon={ErrorIcon} />
                                <Text variant="h2" weight="normal">
                                    {t('errors.unknown-error')}
                                </Text>
                            </Error>
                        }>
                        {children}
                    </ErrorBoundary>
                </Content>
            </Layout>
        </ContentBlock>
    )
}

const Layout = styled('div', {
    position: 'relative',
    display: 'flex',
    minHeight: 300,
    height: 'calc(100vh - 200px)',
    overflow: 'hidden',

    '@md': {
        height: 'calc(100vh - 240px)',
    },

    '@sm': {
        height: '100%',
    },
})

const Sidebar = styled('div', {
    display: 'flex',
    flexShrink: 0,
    flexDirection: 'column',
    width: 280,
    borderRight: `1px solid ${theme.colors.lightGrey}`,

    '@sm': {
        width: '100%',
        border: 'none',
    },

    variants: {
        isHidden: {
            true: {
                '@sm': {
                    transform: 'translateX(-100vw)',
                },
            },
        },
    },
})

const SidebarHeader = styled('div', {
    display: 'flex',
    height: 72,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
})

const SidebarList = styled(ShadowScroller, {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
})

const Content = styled('div', {
    flex: 1,
    overflow: 'hidden',

    '@sm': {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        transform: 'translateX(100vw)',
    },

    variants: {
        isShowing: {
            true: {
                '@sm': {
                    transform: 'translateX(0)',
                },
            },
        },
    },
})

const Error = styled('div', {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 8,
    color: theme.colors.red,
})
