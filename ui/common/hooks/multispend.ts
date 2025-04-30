import type { TFunction } from 'i18next'
import { useState, useMemo, useEffect, useCallback } from 'react'

import {
    matrixApproveMultispendInvitation,
    matrixRejectMultispendInvitation,
    selectMatrixRoomMultispendStatus,
    selectMatrixAuth,
    selectMyMultispendRole,
    selectWalletFederations,
    selectMatrixRoomMultispendTransactions,
    refreshMultispendTransactions,
    selectFormattedMultispendBalance,
    selectCurrency,
    selectMatrixRoomMembers,
} from '../redux'
import {
    MultispendFilterOption,
    MultispendWithdrawalEvent,
    UsdCents,
} from '../types'
import { RpcRoomId } from '../types/bindings'
import { FedimintBridge } from '../utils/fedimint'
import {
    getMultispendInvite,
    makeMultispendWalletHeader,
} from '../utils/matrix'
import { useBtcFiatPrice } from './amount'
import { useCommonDispatch, useCommonSelector } from './redux'
import { useToast } from './toast'

export function useMultispendVoting({
    t,
    fedimint,
    roomId,
    onMultispendAborted = undefined,
    onJoinFederation = undefined,
}: {
    t: TFunction
    fedimint: FedimintBridge
    roomId: RpcRoomId
    onMultispendAborted?: () => void
    onJoinFederation?: (invite: string) => void
}) {
    const toast = useToast()
    const dispatch = useCommonDispatch()
    const [isConfirmingAbort, setIsConfirmingAbort] = useState(false)
    const [needsToJoin, setNeedsToJoin] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const walletFederations = useCommonSelector(selectWalletFederations)
    const myId = useCommonSelector(selectMatrixAuth)?.userId
    const multispendStatus = useCommonSelector(s =>
        selectMatrixRoomMultispendStatus(s, roomId),
    )
    const multispendInvite = multispendStatus
        ? getMultispendInvite(multispendStatus)
        : null
    const myMultispendRole = useCommonSelector(s =>
        selectMyMultispendRole(s, roomId),
    )
    const isProposer = myMultispendRole === 'proposer'
    const hasRejected = Boolean(
        multispendStatus?.status === 'activeInvitation' &&
            myId &&
            multispendStatus.state.rejections.includes(myId),
    )

    const canAccept = useMemo(() => {
        if (
            multispendStatus?.status !== 'activeInvitation' ||
            !myId ||
            myMultispendRole !== 'voter'
        )
            return false

        const hasApproved = Object.values(
            multispendStatus.state.pubkeys,
        ).includes(myId)

        return !hasRejected && !hasApproved
    }, [multispendStatus, myId, myMultispendRole, hasRejected])

    const handleAbortMultispend = async () => {
        if (!isProposer) return

        setIsLoading(true)
        try {
            await fedimint.matrixCancelMultispendGroupInvitation({
                roomId,
            })
        } catch (e) {
            toast.error(t, e)
        } finally {
            setIsLoading(false)
        }
    }

    const handleRejectMultispend = async () => {
        if (isProposer) return

        setIsLoading(true)
        try {
            await dispatch(
                matrixRejectMultispendInvitation({ roomId, fedimint }),
            ).unwrap()
            setIsConfirmingAbort(false)
        } catch (e) {
            toast.error(t, e)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAcceptMultispend = async () => {
        if (!multispendStatus) return
        if (multispendStatus.status !== 'activeInvitation') return
        setIsLoading(true)
        try {
            if (
                !walletFederations.some(
                    f => f.id === multispendStatus.state.federationId,
                )
            ) {
                setNeedsToJoin(true)
            } else {
                await dispatch(
                    matrixApproveMultispendInvitation({ fedimint, roomId }),
                ).unwrap()
            }
        } catch (e) {
            toast.error(t, e)
        } finally {
            setIsLoading(false)
        }
    }

    const abortConfirmationContents = {
        title: t('feature.multispend.abort-multispend-setup'),
        description: t('feature.multispend.abort-group-message'),
        buttons: [
            {
                text: t('words.cancel'),
                onPress: () => setIsConfirmingAbort(false),
            },
            {
                text: t('feature.multispend.yes-abort'),
                primary: true,
                disabled: isLoading,
                onPress: handleAbortMultispend,
            },
        ],
    }

    const rejectConfirmationContents = {
        title: t('feature.multispend.abort-multispend-setup'),
        description: t('feature.multispend.reject-invite-message'),
        buttons: [
            {
                text: t('words.cancel'),
                onPress: () => setIsConfirmingAbort(false),
            },
            {
                text: t('feature.multispend.yes-reject'),
                primary: true,
                disabled: isLoading,
                onPress: handleRejectMultispend,
            },
        ],
    }

    const joinBeforeAcceptContents = multispendInvite
        ? {
              title: t('feature.multispend.join-federation', {
                  federation: multispendInvite.federationName,
              }),
              description: t('feature.multispend.join-federation-notice', {
                  federation: multispendInvite.federationName,
              }),
              buttons: [
                  {
                      text: t('words.cancel'),
                      onPress: () => setNeedsToJoin(false),
                  },
                  {
                      text: t('words.join'),
                      onPress: () =>
                          onJoinFederation &&
                          onJoinFederation(
                              multispendInvite.federationInviteCode,
                          ),
                      primary: true,
                  },
              ],
          }
        : null

    // If the multispend group is aborted for any reason, fire a callback that should handle navigating back to the chat
    useEffect(() => {
        if (!multispendStatus && onMultispendAborted) {
            onMultispendAborted()
        }
    }, [multispendStatus, onMultispendAborted])

    return {
        hasRejected,
        isActive: multispendStatus?.status === 'activeInvitation',
        isProposer,
        isLoading,
        isConfirmingAbort,
        setIsConfirmingAbort,
        canAccept,
        needsToJoin,
        handleAcceptMultispend,
        handleAbortMultispend,
        handleRejectMultispend,
        abortConfirmationContents,
        rejectConfirmationContents,
        joinBeforeAcceptContents,
    }
}

export function useMultispendDisplayUtils(t: TFunction, roomId: RpcRoomId) {
    const selectedCurrency = useCommonSelector(selectCurrency)
    const multispendStatus = useCommonSelector(s =>
        selectMatrixRoomMultispendStatus(s, roomId),
    )
    const formattedMultispendBalance = useCommonSelector(s =>
        selectFormattedMultispendBalance(s, roomId),
    )

    const isActiveInvitation = multispendStatus?.status === 'activeInvitation'
    const isFinalized = multispendStatus?.status === 'finalized'

    const shouldShowHeader = isActiveInvitation || isFinalized

    const shouldShowVoters = isActiveInvitation

    const walletHeader = makeMultispendWalletHeader(t, multispendStatus)

    return {
        shouldShowHeader,
        shouldShowVoters,
        walletHeader,
        formattedMultispendBalance,
        selectedCurrency,
    }
}

export function useMultispendTransactions(t: TFunction, roomId: RpcRoomId) {
    const toast = useToast()
    const dispatch = useCommonDispatch()
    const [isLoading, setIsLoading] = useState(false)
    const transactions = useCommonSelector(s =>
        selectMatrixRoomMultispendTransactions(s, roomId),
    )
    const fetchTransactions = useCallback(async () => {
        setIsLoading(true)
        try {
            await dispatch(refreshMultispendTransactions({ roomId })).unwrap()
        } catch (e) {
            toast.error(t, e)
        } finally {
            setIsLoading(false)
        }
    }, [dispatch, roomId, t, toast])

    useEffect(() => {
        fetchTransactions()
    }, [fetchTransactions])

    return {
        isLoading,
        transactions,
        fetchTransactions,
    }
}

export function useMultispendWithdrawalRequests({
    t,
    fedimint,
    roomId,
}: {
    t: TFunction
    fedimint: FedimintBridge
    roomId: RpcRoomId
}) {
    const toast = useToast()
    const selectedFiatCurrency = useCommonSelector(selectCurrency)
    const { convertCentsToFormattedFiat } =
        useBtcFiatPrice(selectedFiatCurrency)
    const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<
        string | null
    >(null)
    const [isVoting, setIsVoting] = useState(false)
    const [filter, setFilter] = useState<MultispendFilterOption>('all')
    const multispendStatus = useCommonSelector(s =>
        selectMatrixRoomMultispendStatus(s, roomId),
    )
    const { transactions, isLoading, fetchTransactions } =
        useMultispendTransactions(t, roomId)
    const matrixAuth = useCommonSelector(selectMatrixAuth)
    const roomMembers = useCommonSelector(s =>
        selectMatrixRoomMembers(s, roomId),
    )

    const withdrawalRequests = transactions.filter(
        (txn): txn is MultispendWithdrawalEvent => txn.state === 'withdrawal',
    )

    const getWithdrawalStatus = useCallback(
        (event: MultispendWithdrawalEvent) => {
            if (multispendStatus?.status !== 'finalized') return 'pending'
            if (event.event.withdrawalRequest.completed) return 'completed'

            const voterCount = Object.keys(
                multispendStatus.finalized_group.pubkeys,
            ).length
            const voteCount = Object.keys(
                event.event.withdrawalRequest.signatures,
            ).length
            const rejectionCount =
                event.event.withdrawalRequest.rejections.length

            const threshold =
                multispendStatus.finalized_group.invitation.threshold

            if (voteCount >= threshold) return 'approved'
            if (voterCount - rejectionCount < threshold) return 'rejected'

            return 'pending'
        },
        [multispendStatus],
    )

    const getFormattedWithdrawalStatus = useCallback(
        (event: MultispendWithdrawalEvent) => {
            const status = getWithdrawalStatus(event)

            switch (status) {
                case 'approved':
                    return t('words.approved')
                case 'rejected':
                    return t('words.rejected')
                case 'pending':
                    return t('words.pending')
                case 'completed':
                    return t('words.complete')
            }
        },
        [t, getWithdrawalStatus],
    )

    const hasUserVotedForWithdrawal = useCallback(
        (event: MultispendWithdrawalEvent, userId: string) => {
            const rejections = event.event.withdrawalRequest.rejections
            const signatures = event.event.withdrawalRequest.signatures

            return Boolean(rejections.includes(userId) || signatures[userId])
        },
        [],
    )

    const haveIVotedForWithdrawal = useCallback(
        (event: MultispendWithdrawalEvent) => {
            return hasUserVotedForWithdrawal(event, matrixAuth?.userId ?? '')
        },
        [hasUserVotedForWithdrawal, matrixAuth?.userId],
    )

    const filteredWithdrawalRequests = useMemo(() => {
        if (filter === 'all' || multispendStatus?.status !== 'finalized')
            return withdrawalRequests

        const filtered = withdrawalRequests.filter(event => {
            const eventStatus = getWithdrawalStatus(event)

            if (filter === 'approved')
                return eventStatus === 'approved' || eventStatus === 'completed'

            return eventStatus === filter
        })

        if (filter === 'pending') {
            filtered
                // Sort by oldest
                .sort((a, b) => a.time - b.time)
                // Sort by not voted for
                .sort((a, b) => {
                    if (!matrixAuth) return 0

                    if (hasUserVotedForWithdrawal(a, matrixAuth.userId))
                        return 1
                    if (hasUserVotedForWithdrawal(b, matrixAuth.userId))
                        return -1
                    return 0
                })
        }

        return filtered
    }, [
        filter,
        multispendStatus?.status,
        withdrawalRequests,
        getWithdrawalStatus,
        matrixAuth,
        hasUserVotedForWithdrawal,
    ])

    const getWithdrawalRequest = useCallback(
        (event: MultispendWithdrawalEvent) => {
            const { withdrawalRequest } = event.event

            const sender = roomMembers.find(
                m => m.id === withdrawalRequest.sender,
            )
            const approvals = Object.keys(withdrawalRequest.signatures)
            const rejections = withdrawalRequest.rejections

            return {
                sender,
                request: withdrawalRequest,
                approvals,
                rejections,
                approvalCount: approvals.length,
                rejectionCount: rejections.length,
                formattedFiatAmount: convertCentsToFormattedFiat(
                    withdrawalRequest.request.transfer_amount as UsdCents,
                    'none',
                ),
                formattedFiatAmountWithCurrency: convertCentsToFormattedFiat(
                    withdrawalRequest.request.transfer_amount as UsdCents,
                    'end',
                ),
                selectedFiatCurrency,
                status: getWithdrawalStatus(event),
            }
        },
        [
            roomMembers,
            convertCentsToFormattedFiat,
            selectedFiatCurrency,
            getWithdrawalStatus,
        ],
    )

    const handleRejectRequest = useCallback(async () => {
        if (!selectedWithdrawalId) return

        setIsVoting(true)
        try {
            await fedimint.matrixSendMultispendWithdrawalReject({
                roomId,
                withdrawRequestId: selectedWithdrawalId,
            })

            setSelectedWithdrawalId(null)
        } catch (e) {
            toast.error(t, e)
        } finally {
            setIsVoting(false)
        }
    }, [selectedWithdrawalId, t, toast, roomId, fedimint])

    const handleApproveRequest = useCallback(async () => {
        if (!selectedWithdrawalId) return

        setIsVoting(true)
        try {
            await fedimint.matrixSendMultispendWithdrawalApprove({
                roomId,
                withdrawRequestId: selectedWithdrawalId,
            })

            setSelectedWithdrawalId(null)
        } catch (e) {
            toast.error(t, e)
        } finally {
            setIsVoting(false)
        }
    }, [selectedWithdrawalId, roomId, t, toast, fedimint])

    const filterOptions = [
        { value: 'all', label: t('words.all') },
        { value: 'pending', label: t('words.pending') },
        { value: 'approved', label: t('words.approved') },
        { value: 'rejected', label: t('words.rejected') },
    ]
    const selectedFilterOption = filterOptions.find(
        option => option.value === filter,
    )

    return {
        isVoting,
        filter,
        setFilter,
        filterOptions,
        selectedFilterOption,
        selectedWithdrawalId,
        setSelectedWithdrawalId,
        withdrawalRequests,
        isLoading,
        fetchTransactions,
        getWithdrawalStatus,
        getFormattedWithdrawalStatus,
        hasUserVotedForWithdrawal,
        haveIVotedForWithdrawal,
        filteredWithdrawalRequests,
        getWithdrawalRequest,
        handleRejectRequest,
        handleApproveRequest,
    }
}
