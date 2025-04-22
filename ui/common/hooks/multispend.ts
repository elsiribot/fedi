import type { TFunction } from 'i18next'
import { useState, useMemo, useEffect } from 'react'

import {
    matrixApproveMultispendInvitation,
    matrixRejectMultispendInvitation,
    selectMatrixRoomMultispendStatus,
    selectMatrixAuth,
    selectMyMultispendRole,
    selectWalletFederations,
} from '../redux'
import { RpcRoomId } from '../types/bindings'
import { FedimintBridge } from '../utils/fedimint'
import {
    getMultispendInvite,
    makeMultispendWalletHeader,
} from '../utils/matrix'
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
    const canAccept = useMemo(() => {
        if (
            multispendStatus?.status !== 'activeInvitation' ||
            !myId ||
            myMultispendRole !== 'voter'
        )
            return false

        const hasRejected = multispendStatus.state.rejections.includes(myId)
        const hasApproved = Object.values(
            multispendStatus.state.pubkeys,
        ).includes(myId)

        return !hasRejected && !hasApproved
    }, [multispendStatus, myId, myMultispendRole])

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
        if (multispendStatus?.status === 'inactive' && onMultispendAborted) {
            onMultispendAborted()
        }
    }, [multispendStatus, onMultispendAborted])

    return {
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
    const multispendStatus = useCommonSelector(s =>
        selectMatrixRoomMultispendStatus(s, roomId),
    )
    const shouldShowHeader =
        multispendStatus?.status === 'activeInvitation' ||
        multispendStatus?.status === 'finalized'

    const walletHeader = makeMultispendWalletHeader(t, multispendStatus)

    return {
        shouldShowHeader,
        walletHeader,
    }
}
