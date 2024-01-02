import { useState, useMemo, useEffect } from 'react'

import type { ChatMember, ChatMessage, Federation } from '@fedi/common/types'

import {
    connectChat,
    fetchChatMember,
    publishPushNotificationToken,
    selectActiveFederation,
    selectChatClientStatus,
    selectChatMember,
    selectFederationsWithChatConnections,
    selectLatestChatMessage,
    selectLatestPaymentUpdate,
    selectPushNotificationToken,
    setLastReadMessageId,
    setLastReadPaymentUpdateId,
    setLastSeenMessageId,
    setLastSeenPaymentUpdateId,
} from '../redux'
import { getLatestPaymentUpdate } from '../utils/chat'
import { FedimintBridge } from '../utils/fedimint'
import { makeLog } from '../utils/log'
import { useCommonDispatch, useCommonSelector } from './redux'

const log = makeLog('common/hooks/chat')

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
 * Automatically dispatch an update to the last message seen and last payment-update
 * seen while a component using this hook is mounted.
 *
 * the pauseUpdates param is used by the native app since components remain
 * mounted even when the screen is not in focus. the navigation library
 * returns isFocused = false for any screen using this hook and we can pause it
 */
export function useUpdateLastMessageSeen(pauseUpdates?: boolean) {
    const dispatch = useCommonDispatch()
    const federationId = useCommonSelector(selectActiveFederation)?.id
    const latestMessage = useCommonSelector(selectLatestChatMessage)
    const latestPaymentUpdate = useCommonSelector(selectLatestPaymentUpdate)

    useEffect(() => {
        if (!latestMessage || !federationId || pauseUpdates) return
        dispatch(
            setLastSeenMessageId({
                federationId,
                messageId: latestMessage.id,
            }),
        )
    }, [dispatch, federationId, latestMessage, pauseUpdates])

    useEffect(() => {
        if (!latestPaymentUpdate || !federationId || pauseUpdates) return
        dispatch(
            setLastSeenPaymentUpdateId({
                federationId,
                messageId: latestPaymentUpdate.id,
                updatedAt: latestPaymentUpdate.payment?.updatedAt,
            }),
        )
    }, [dispatch, federationId, latestPaymentUpdate, pauseUpdates])
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

/**
 * Automatically dispatch an update to the last payment update read in a chat
 * while a component using this hook is mounted.
 *
 * the pauseUpdates param is used by the native app since components remain
 * mounted even when the screen is not in focus. the navigation library
 * returns isFocused = false for any screen using this hook and we can pause it
 */
export function useUpdateLastPaymentUpdateRead(
    chatId: string,
    messages: ChatMessage[],
    pauseUpdates?: boolean,
) {
    const dispatch = useCommonDispatch()
    const federationId = useCommonSelector(selectActiveFederation)?.id
    const latestPaymentUpdate = getLatestPaymentUpdate(messages)

    const messageId = latestPaymentUpdate?.id
    const updatedAt = latestPaymentUpdate?.payment?.updatedAt
    useEffect(() => {
        if (!federationId || !messageId || pauseUpdates) return
        dispatch(
            setLastReadPaymentUpdateId({
                federationId,
                chatId,
                messageId,
                updatedAt,
            }),
        )
    }, [
        dispatch,
        chatId,
        federationId,
        latestPaymentUpdate,
        messageId,
        updatedAt,
        pauseUpdates,
    ])
}

// This hook sets a given device token to be published to the XMPP server
// so it can receive push notifications for new messages
export function usePublishNotificationToken(getToken: () => Promise<string>) {
    const dispatch = useCommonDispatch()
    const federationId = useCommonSelector(selectActiveFederation)?.id
    const pushNotificationToken = useCommonSelector(selectPushNotificationToken)
    const isChatOnline = useCommonSelector(selectChatClientStatus) === 'online'

    useEffect(() => {
        // Can't publish if no federation is selected
        if (!federationId) return

        // Don't set the token if we already have one
        if (pushNotificationToken) return

        // Can't publish if chat isn't online
        if (!isChatOnline) return

        log.info('Publishing push notification token')
        dispatch(publishPushNotificationToken({ federationId, getToken }))
            .unwrap()
            .then(() => {
                log.info('Successfully published push notification token')
            })
            .catch(err => {
                log.error('Failed to publish push notification token', err)
            })
    }, [federationId, isChatOnline, dispatch, getToken, pushNotificationToken])
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

/**
 * Given an instance of the bridge, monitor all available chat connections and
 * attempt to reconnect and continue attempting on failure
 */
export async function useMonitorChatConnections(fedimint: FedimintBridge) {
    const dispatch = useCommonDispatch()
    const federationsWithChat = useCommonSelector(
        selectFederationsWithChatConnections,
    )

    useEffect(() => {
        // Can't connect any chats if no federations support it
        if (federationsWithChat.length === 0) return

        const attemptChatConnection = async (
            federationId: Federation['id'],
        ) => {
            await dispatch(
                connectChat({
                    fedimint,
                    federationId,
                }),
            ).unwrap()
        }

        const reconnectTimers = federationsWithChat.map(f => {
            let reconnectTimeout: number | undefined
            try {
                log.debug('attemptChatConnection for federation', f.id)
                attemptChatConnection(f.id)
            } catch (error) {
                // Attempt reconnect in 5s if it fails
                log.error(
                    `failed to connect chat for federation ${f.id} retrying in 5s...`,
                )
                reconnectTimeout = setTimeout(attemptChatConnection, 5000)
            }

            // reconnectTimeout is undefined if connection succeeds on first try
            return reconnectTimeout
        })

        // Clear reconnectTimers if dependencies change in case any of the
        // chat connections are in a 5-second retry state
        return () => {
            if (reconnectTimers.length > 0) {
                reconnectTimers.filter(c => !!c).forEach(c => clearTimeout(c))
            }
        }
        // Dependencies are non-exhaustive here intentionally to prevent
        // multiple calls to connectChat which may cause race-condition bugs
    }, [federationsWithChat.length])
}
