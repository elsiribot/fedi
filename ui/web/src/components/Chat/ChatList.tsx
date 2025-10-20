import { useRouter } from 'next/router'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import { selectMatrixChatsList } from '@fedi/common/redux'

import * as Layout from '../../components/Layout'
import { useAppSelector } from '../../hooks'
import { styled, theme } from '../../styles'
import MainHeaderButtons from '../MainHeaderButtons'
import { ChatListItem } from './ChatListItem'

export const ChatList: React.FC = () => {
    const { t } = useTranslation()
    const rooms = useAppSelector(selectMatrixChatsList)
    const router = useRouter()

    const goToNewChat = () => {
        router.push('/chat/new')
    }

    return (
        <Layout.Root>
            <Layout.Header>
                <Layout.Title small>{t('words.chat')}</Layout.Title>
                <MainHeaderButtons onAddPress={goToNewChat} />
            </Layout.Header>

            <Layout.Content fullWidth>
                {rooms.length === 0 ? (
                    <EmptyMessage>
                        {t('feature.chat.select-or-start')}
                    </EmptyMessage>
                ) : (
                    <Chats>
                        {rooms.map(room => (
                            <ErrorBoundary key={room.id} fallback={null}>
                                <ChatListItem room={room} />
                            </ErrorBoundary>
                        ))}
                    </Chats>
                )}
            </Layout.Content>
        </Layout.Root>
    )
}

const Chats = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
})

const EmptyMessage = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    height: '100%',
    padding: 24,
    color: theme.colors.darkGrey,
})
