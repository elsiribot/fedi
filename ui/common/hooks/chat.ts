import { useState, useMemo, useEffect } from 'react'

import type { ChatMember, ChatMessage } from '@fedi/common/types'

import {
    fetchChatMember,
    selectActiveFederation,
    selectChatClientStatus,
    selectChatMember,
    selectLatestChatMessage,
    selectPushNotificationToken,
    setLastReadMessageId,
    setLastSeenMessageId,
    setPushNotificationToken,
} from '../redux'
import { useCommonDispatch, useCommonSelector } from './redux'

export function useChatMemberSearch(members: ChatMember[]) {
    const [query, setQuery] = useState('')

    const searchedMembers = useMemo(() => {
        if (!query) return members
        const lowerQuery = query.toLowerCase()
        const filteredMembers = members.filter(m =>
            m.username.toLowerCase().includes(lowerQuery),
        )
        return filteredMembers.sort((m1, m2) => {
            const m1Name = m1.username.toLowerCase()
            const m2Name = m2.username.toLowerCase()
            if (m1Name === lowerQuery) {
                return -1
            }
            if (m2Name === lowerQuery) {
                return 1
            }
            if (m1Name.startsWith(lowerQuery)) {
                return -1
            }
            if (m2Name.startsWith(lowerQuery)) {
                return 1
            }
            return m1Name.localeCompare(m2Name)
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
    }, [dispatch, federationId, latestMessage, pauseUpdates])
}

/**
 * Automatically dispatch an update to the last message read in a chat while a
 * component using this hook is mounted.
 *
 * the pauseUpdates param is used by the native app since components remain
 * mounted even when the screen is not in focus. the navigation library
 * returns isFocused = false for any screen using this hook and we can pause it
 */
export function useUpdateLastMessageRead(
    chatId: string,
    latestMessage: ChatMessage | null | undefined,
    pauseUpdates?: boolean,
) {
    const dispatch = useCommonDispatch()
    const federationId = useCommonSelector(selectActiveFederation)?.id

    const messageId = latestMessage?.id
    useEffect(() => {
        if (!federationId || !messageId || pauseUpdates) return
        dispatch(setLastReadMessageId({ federationId, chatId, messageId }))
    }, [dispatch, chatId, federationId, latestMessage, messageId, pauseUpdates])
}

// This hook sets a given device token to be published to the XMPP server
// so it can receive push notifications for new messages
export function usePublishNotificationToken(
    getDeviceToken: () => Promise<string>,
) {
    const dispatch = useCommonDispatch()
    const activeFederationId = useCommonSelector(
        s => s.federation.activeFederationId,
    )
    const pushNotificationToken = useCommonSelector(selectPushNotificationToken)

    useEffect(() => {
        if (!activeFederationId || pushNotificationToken) return

        getDeviceToken()
            .then(token => {
                dispatch(
                    setPushNotificationToken({
                        federationId: activeFederationId as string,
                        pushNotificationToken: token,
                    }),
                )
            })
            .catch(error => {
                console.error('Failed to get device token', error)
            })
    }, [activeFederationId, dispatch, getDeviceToken, pushNotificationToken])
}

/**
 * Given a member id, return the chat member and whether or not we're actively
 * fetching the chat member. If the chat member is not found in the redux store,
 * attempt to fetch information about them from the chat server.
 */
export function useChatMember(memberId: string) {
    const dispatch = useCommonDispatch()
    const federationId = useCommonSelector(selectActiveFederation)?.id
    const member = useCommonSelector(s => selectChatMember(s, memberId))
    const isChatOnline = useCommonSelector(selectChatClientStatus) === 'online'
    const [isFetchingMember, setIsFetchingMember] = useState(false)

    const hasMember = !!member
    useEffect(() => {
        if (hasMember || !federationId || !isChatOnline) return
        setIsFetchingMember(true)
        dispatch(fetchChatMember({ federationId, memberId }))
            .catch(() => {
                /* no-op */
            })
            .finally(() => {
                setIsFetchingMember(false)
            })
    }, [dispatch, hasMember, federationId, isChatOnline, memberId])

    return { member, isFetchingMember }
}
