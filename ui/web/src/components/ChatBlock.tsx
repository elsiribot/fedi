import React from 'react'
import { useTranslation } from 'react-i18next'

import { selectOrderedChatList } from '@fedi/common/redux'

import { useAppSelector } from '../hooks'
import { styled, theme } from '../styles'
import { Button } from './Button'
import { ChatListItem } from './ChatListItem'
import { ContentBlock } from './ContentBlock'
import { Text } from './Text'

interface Props {
    children: React.ReactNode
    isShowingContent: boolean
}

export const ChatBlock: React.FC<Props> = ({ children, isShowingContent }) => {
    const { t } = useTranslation()
    const chats = useAppSelector(selectOrderedChatList)

    return (
        <ContentBlock maxWidth={840} padding={0}>
            <Layout>
                <Sidebar isHidden={isShowingContent}>
                    <SidebarHeader>
                        <Text variant="h2">{t('words.chat')}</Text>
                        <Button size="sm" variant="outline" href="/chat/new">
                            {t('feature.chat.new-chat')}
                        </Button>
                    </SidebarHeader>
                    <SidebarList>
                        {chats.map(chat => (
                            <ChatListItem key={chat.id} chat={chat} />
                        ))}
                    </SidebarList>
                </Sidebar>
                <Content isShowing={isShowingContent}>{children}</Content>
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

const SidebarList = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    overflow: 'auto',
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
