import { useState, useMemo, useEffect } from 'react'

import type { ChatMember, ChatMessage } from '@fedi/common/types'

import {
    selectActiveFederation,
    selectLatestChatMessage,
    setLastReadMessageId,
    setLastSeenMessageId,
} from '../redux'
import { useCommonDispatch, useCommonSelector } from './redux'

export function useChatMemberSearch(members: ChatMember[]) {
    const [query, setQuery] = useState('')

    const searchedMembers = useMemo(() => {
        if (!query) return members
        const lowerQeury = query.toLowerCase()
        const filteredMembers = members.filter(m =>
            m.username.toLowerCase().includes(lowerQeury),
        )
        return filteredMembers.sort((m1, m2) => {
            const m1Name = m1.username.toLowerCase()
            const m2Name = m2.username.toLowerCase()
            if (m1Name === lowerQeury) {
                return 1
            }
            if (m2Name === lowerQeury) {
                return -1
            }
            if (m1Name.startsWith(lowerQeury)) {
                return 1
            }
            if (m2Name.startsWith(lowerQeury)) {
                return -1
            }
            return 0
        })
    }, [members, query])

    const isExactMatch =
        searchedMembers[0]?.username.toLowerCase() === query.toLowerCase()

    return {
        query,
        setQuery,
        searchedMembers,
        isExactMatch,
    }
}

/**
 * Automatically dispatch an update to the last message seen while a component
 * using this hook is mounted.
 *
 * the pauseUpdates param is used by the native app since components remain
 * mounted even when the screen is not in focus. the navigation library
 * returns isFocused = false for any screen using this hook and we can pause it
 */
export function useUpdateLastMessageSeen(pauseUpdates?: boolean) {
    const dispatch = useCommonDispatch()
    const federationId = useCommonSelector(selectActiveFederation)?.id
    const latestMessage = useCommonSelector(selectLatestChatMessage)

    useEffect(() => {
        if (!latestMessage || !federationId || pauseUpdates) return
        dispatch(
            setLastSeenMessageId({
                federationId,
                messageId: latestMessage.id,
            }),
        )
    }, [dispatch, latestMessage, federationId])
}

/**
 * Automatically dispatch an update to the last message read in a chat while a
 * component using this hook is mounted.
 */
export function useUpdateLastMessageRead(
    chatId: string,
    latestMessage: ChatMessage | null | undefined,
) {
    const dispatch = useCommonDispatch()
    const federationId = useCommonSelector(selectActiveFederation)?.id

    const messageId = latestMessage?.id
    useEffect(() => {
        if (!federationId || !messageId) return
        dispatch(setLastReadMessageId({ federationId, chatId, messageId }))
    }, [dispatch, federationId, latestMessage, chatId, messageId])
}
