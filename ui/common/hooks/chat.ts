import { TFunction } from 'i18next'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'

import type {
    ChatMember,
    ChatMessage,
    Federation,
    Sats,
} from '@fedi/common/types'

import {
    fetchChatMember,
    configureMatrixPushNotifications,
    selectActiveFederation,
    selectActiveFederationId,
    selectAuthenticatedMember,
    selectChatClientLastOnlineAt,
    selectChatClientStatus,
    selectChatLastReadMessageTimestamps,
    selectChatLastSeenMessageTimestamp,
    selectChatMember,
    selectHasSetMatrixDisplayName,
    selectLatestChatMessageTimestamp,
    selectLatestPaymentUpdateTimestamp,
    selectMatrixAuth,
    selectPayFromFederation,
    sendMatrixPaymentPush,
    sendMatrixPaymentRequest,
    setLastReadMessageTimestamp,
    setLastSeenMessageTimestamp,
    setMatrixDisplayName,
    selectMatrixPushNotificationToken,
    connectChat,
    selectFederationsWithChatConnections,
    selectIsMatrixReady,
} from '../redux'
import { getLatestMessage, getLatestPaymentUpdate } from '../utils/chat'
import { FedimintBridge } from '../utils/fedimint'
import { makeLog } from '../utils/log'
import { useMinMaxSendAmount, useMinMaxRequestAmount } from './amount'
import { useCommonDispatch, useCommonSelector } from './redux'
import { useToast } from './toast'

const log = makeLog('common/hooks/chat')

/** @deprecated XMPP legacy code */
export function useChatMemberSearch(members: ChatMember[]) {
    const [query, setQuery] = useState('')

    const authenticatedMember = useSelector(selectAuthenticatedMember)
    const searchedMembers = useMemo(() => {
        if (!query) return members.filter(m => m.id !== authenticatedMember?.id)
        const lowerQuery = query.toLowerCase()
        const filteredMembers = members.filter(
            m =>
                m.username.toLowerCase().includes(lowerQuery) &&
                m.id !== authenticatedMember?.id,
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
    }, [members, query, authenticatedMember])

    const isExactMatch =
        searchedMembers[0]?.username.toLowerCase() === query.toLowerCase() &&
        searchedMembers[0]?.id !== authenticatedMember?.id

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
 *
 * @deprecated XMPP legacy code
 */
export function useUpdateLastMessageSeen(pauseUpdates?: boolean) {
    const dispatch = useCommonDispatch()
    const federationId = useCommonSelector(selectActiveFederation)?.id
    const lastSeenMessageTimestamp = useCommonSelector(
        selectChatLastSeenMessageTimestamp,
    )
    const latestMessageTimestamp = useCommonSelector(
        selectLatestChatMessageTimestamp,
    )
    const latestPaymentUpdateTimestamp = useCommonSelector(
        selectLatestPaymentUpdateTimestamp,
    )

    useEffect(() => {
        if (!latestMessageTimestamp || !federationId || pauseUpdates) return

        let latestTimestamp = latestMessageTimestamp
        // payment updates might come in after the last message so use
        // that if applicable
        if (
            latestPaymentUpdateTimestamp &&
            latestPaymentUpdateTimestamp > latestMessageTimestamp
        ) {
            latestTimestamp = latestPaymentUpdateTimestamp
        }

        // don't dispatch if we already have the latest timestamp
        if (
            lastSeenMessageTimestamp &&
            lastSeenMessageTimestamp >= latestTimestamp
        )
            return

        dispatch(
            setLastSeenMessageTimestamp({
                federationId,
                timestamp: latestTimestamp,
            }),
        )
    }, [
        dispatch,
        federationId,
        lastSeenMessageTimestamp,
        latestMessageTimestamp,
        latestPaymentUpdateTimestamp,
        pauseUpdates,
    ])
}

/**
 * Automatically dispatch an update to the last message read in a chat while a
 * component using this hook is mounted.
 *
 * the pauseUpdates param is used by the native app since components remain
 * mounted even when the screen is not in focus. the navigation library
 * returns isFocused = false for any screen using this hook and we can pause it
 * @deprecated XMPP legacy code
 */
export function useUpdateLastMessageRead(
    chatId: string,
    messages: ChatMessage[],
    pauseUpdates?: boolean,
) {
    const dispatch = useCommonDispatch()
    const federationId = useCommonSelector(selectActiveFederation)?.id
    const lastReadMessageTimestamps = useCommonSelector(
        selectChatLastReadMessageTimestamps,
    )
    const lastReadTimestampInChat = lastReadMessageTimestamps[chatId]
    const latestMessageTimestamp = getLatestMessage(messages)?.sentAt
    const latestPaymentUpdateTimestamp =
        getLatestPaymentUpdate(messages)?.payment?.updatedAt

    useEffect(() => {
        if (!federationId || !chatId || !latestMessageTimestamp || pauseUpdates)
            return

        let latestTimestamp = latestMessageTimestamp
        // payment updates might come in after the last message so use
        // that if applicable
        if (
            latestPaymentUpdateTimestamp &&
            latestPaymentUpdateTimestamp > latestMessageTimestamp
        ) {
            latestTimestamp = latestPaymentUpdateTimestamp
        }

        // don't dispatch if we already have the latest timestamp
        if (
            lastReadTimestampInChat &&
            lastReadTimestampInChat >= latestTimestamp
        )
            return

        dispatch(
            setLastReadMessageTimestamp({
                federationId,
                chatId,
                timestamp: latestTimestamp,
            }),
        )
    }, [
        dispatch,
        chatId,
        federationId,
        lastReadMessageTimestamps,
        latestPaymentUpdateTimestamp,
        latestMessageTimestamp,
        lastReadTimestampInChat,
        pauseUpdates,
    ])
}

// This hook sets a given device token to be published to the Matrix Sygnal Push server
// so it can process push notifications for timeline events
export function usePublishNotificationToken(
    getToken: () => Promise<string>,
    needsPermission = false,
) {
    const dispatch = useCommonDispatch()
    const pushNotificationToken = useCommonSelector(
        selectMatrixPushNotificationToken,
    )
    const isMatrixReady = useCommonSelector(selectIsMatrixReady)

    useEffect(() => {
        // Can't publish if we don't have permission to get the token.
        if (needsPermission) return

        // Don't publish the token again if we already did it
        if (pushNotificationToken) {
            log.info('Already published and stored notification token')
            return
        }

        // Can't publish if matrix isn't ready
        if (!isMatrixReady) return

        log.info('Publishing push notification token')
        dispatch(configureMatrixPushNotifications({ getToken }))
            .unwrap()
            .then(() => {
                log.info(
                    'Successfully published matrix push notification token',
                )
            })
            .catch(err => {
                log.error(
                    'Failed to publish matrix push notification token',
                    err,
                )
            })
    }, [
        needsPermission,
        isMatrixReady,
        dispatch,
        getToken,
        pushNotificationToken,
    ])
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

export const useIsChatConnected = () => {
    const chatStatus = useCommonSelector(selectChatClientStatus)
    const lastOnlineAt = useCommonSelector(selectChatClientLastOnlineAt)

    const isOffline = chatStatus !== 'online'
    const [showOffline, setShowOffline] = useState(isOffline)

    // Show offline badge after initial render if we go offline for more than
    // 3 seconds. Initial render will show immediately if we're offline.
    useEffect(() => {
        if (!isOffline) {
            setShowOffline(false)
            return
        }
        const now = Date.now()
        const delay = lastOnlineAt - now + 3000
        const timeout = setTimeout(() => setShowOffline(true), delay)
        return () => clearTimeout(timeout)
    }, [isOffline, lastOnlineAt])

    return !showOffline
}

export const useChatPaymentPush = (
    t: TFunction,
    fedimint: FedimintBridge,
    roomId: string,
    recipientId: string,
) => {
    const toast = useToast()
    const dispatch = useCommonDispatch()
    const payFromFederation = useCommonSelector(selectPayFromFederation)
    const federationId = payFromFederation?.id || ''
    const [isProcessing, setIsProcessing] = useState<boolean>(false)

    const handleSendPayment = useCallback(
        async (amount: Sats, onSuccess: () => void) => {
            if (!federationId || !roomId || !amount) return
            setIsProcessing(true)
            try {
                await dispatch(
                    sendMatrixPaymentPush({
                        fedimint,
                        federationId,
                        roomId,
                        recipientId,
                        amount,
                    }),
                ).unwrap()
                onSuccess()
            } catch (err) {
                toast.error(t, err, 'errors.unknown-error')
            }
            setIsProcessing(false)
        },
        [dispatch, federationId, fedimint, recipientId, roomId, t, toast],
    )

    return {
        isProcessing,
        handleSendPayment,
    }
}

export const useChatPaymentUtils = (
    t: TFunction,
    fedimint: FedimintBridge,
    roomId: string | undefined,
    recipientId: string,
) => {
    const toast = useToast()
    const dispatch = useCommonDispatch()
    const activeFederationId = useCommonSelector(selectActiveFederationId)
    const [federationId] = useState(activeFederationId)
    const sendMinMax = useMinMaxSendAmount()
    const requestMinMax = useMinMaxRequestAmount({ ecashRequest: {} })
    const [amount, setAmount] = useState(0 as Sats)
    const [submitAction, setSubmitAction] = useState<null | 'send' | 'request'>(
        null,
    )
    const [submitAttempts, setSubmitAttempts] = useState(0)
    const [submitType, setSubmitType] = useState<'send' | 'request'>()

    const inputMinMax =
        submitType === 'send'
            ? sendMinMax
            : submitType === 'request'
            ? requestMinMax
            : {}

    const canRequestAmount =
        amount >= requestMinMax.minimumAmount &&
        amount <= requestMinMax.maximumAmount
    const canSendAmount =
        amount >= sendMinMax.minimumAmount && amount <= sendMinMax.maximumAmount

    const handleSendPayment = useCallback(
        async (onSuccess: () => void) => {
            // TODO: allow for on-the-fly room creation?
            if (!federationId || !roomId) return
            try {
                setSubmitAction('send')
                await dispatch(
                    sendMatrixPaymentPush({
                        fedimint,
                        federationId,
                        roomId,
                        recipientId,
                        amount,
                    }),
                ).unwrap()
                onSuccess()
            } catch (err) {
                toast.error(t, err, 'errors.unknown-error')
            }
            setSubmitAction(null)
        },
        [
            amount,
            dispatch,
            federationId,
            fedimint,
            recipientId,
            roomId,
            t,
            toast,
        ],
    )

    const handleRequestPayment = useCallback(
        async (onSuccess: () => void) => {
            // TODO: allow for on-the-fly room creation?
            if (!federationId || !roomId) return
            setSubmitType('request')
            setSubmitAttempts(attempt => attempt + 1)
            if (!canRequestAmount) return

            setSubmitAction('request')
            try {
                await dispatch(
                    sendMatrixPaymentRequest({
                        fedimint,
                        federationId,
                        roomId,
                        amount,
                    }),
                ).unwrap()
                onSuccess()
            } catch (err) {
                toast.error(t, 'errors.unknown-error')
            }
            setSubmitAction(null)
        },
        [
            amount,
            canRequestAmount,
            dispatch,
            federationId,
            fedimint,
            roomId,
            t,
            toast,
        ],
    )

    return {
        amount,
        setAmount,
        submitType,
        setSubmitType,
        submitAttempts,
        setSubmitAttempts,
        submitAction,
        setSubmitAction,
        sendMinMax,
        requestMinMax,
        inputMinMax,
        canSendAmount,
        handleRequestPayment,
        handleSendPayment,
    }
}

export const useDisplayNameForm = (t: TFunction) => {
    const [username, setUsername] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const toast = useToast()
    const dispatch = useCommonDispatch()
    const matrixAuth = useCommonSelector(selectMatrixAuth)
    const hasSetDisplayName = useCommonSelector(selectHasSetMatrixDisplayName)

    useEffect(() => {
        if (!matrixAuth) return
        const { displayName } = matrixAuth
        if (hasSetDisplayName) {
            setUsername(displayName)
        }
    }, [hasSetDisplayName, matrixAuth])

    const handleChangeUsername = useCallback(
        (input: string) => {
            const isValid =
                // Don't allow uppercase letters
                !/[A-Z]/.test(input) &&
                // Don't allow usernames greater than 21 characters
                input.length <= 21
            if (!isValid) {
                toast.error(t, 'errors.invalid-username')
                return
            }
            setUsername(input)
        },
        [t, toast],
    )

    const handleSubmitDisplayName = useCallback(
        async (onSuccess: () => void) => {
            setIsSubmitting(true)
            try {
                await dispatch(
                    setMatrixDisplayName({ displayName: username }),
                ).unwrap()
                onSuccess()
            } catch (err) {
                log.error('handleSubmit', err)
                toast.error(t, err)
            }
            setIsSubmitting(false)
        },
        [dispatch, t, toast, username],
    )

    return {
        username,
        isSubmitting,
        handleChangeUsername,
        handleSubmitDisplayName,
    }
}
