import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useFedimint } from '@fedi/common/hooks/fedimint'
import { useMatrixChatInvites } from '@fedi/common/hooks/matrix'
import {
    getMatrixRoomPreview,
    selectGroupPreview,
    selectMatrixRoom,
} from '@fedi/common/redux'
import { makeLog } from '@fedi/common/utils/log'

import { chatRoute, chatRoomRoute } from '../../constants/routes'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { Button } from '../Button'
import { ChatAvatar } from '../Chat/ChatAvatar'
import { Column } from '../Flex'
import { HoloLoader } from '../HoloLoader'
import * as Layout from '../Layout'
import { Text } from '../Text'
import { KnockPendingView } from './KnockPendingView'

type Props = {
    roomId: string
}

const log = makeLog('ConfirmJoinPublicGroup')

export const ChatConfirmJoinPublicRoom = ({ roomId }: Props) => {
    const { t } = useTranslation()
    const { replace } = useRouter()
    const dispatch = useAppDispatch()
    const fedimint = useFedimint()

    const { joinPublicGroup, knockGroup } = useMatrixChatInvites(t)

    const room = useAppSelector(s => selectMatrixRoom(s, roomId))
    const groupPreview = useAppSelector(s => selectGroupPreview(s, roomId))

    const [isJoiningGroup, setIsJoiningGroup] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    // Knock was issued but sync hasn't reflected it yet. Local flag swaps in
    // KnockPendingView so a fast second tap can't fire a duplicate knock.
    const [hasKnockedLocally, setHasKnockedLocally] = useState(false)

    const isAlreadyKnocked = room?.roomState === 'knocked' || hasKnockedLocally
    const isPublic = groupPreview?.info?.isPublic ?? false
    // Some homeservers won't return preview metadata even for knockable rooms,
    // so default to true and let the knock response reveal invite-only rooms.
    const allowKnocking = groupPreview?.info?.allowKnocking ?? true
    const canJoin = isPublic || allowKnocking
    const roomName = groupPreview?.info?.name || room?.name || null

    // Existing members/invitees go straight to the conversation; only knocked
    // rooms stay here to show the pending view.
    useEffect(() => {
        if (room && room.roomState !== 'knocked') replace(chatRoomRoute(roomId))
    }, [room, roomId, replace])

    useEffect(() => {
        if (room || groupPreview) return

        let isCancelled = false
        const previewRequest = dispatch(
            getMatrixRoomPreview({ fedimint, roomId }),
        )

        setIsLoading(true)
        previewRequest
            .unwrap()
            .catch(() => {
                if (isCancelled) return

                log.info('Failed to fetch room preview')
                replace(chatRoute)
            })
            .finally(() => {
                if (isCancelled) return
                setIsLoading(false)
            })

        return () => {
            isCancelled = true
            previewRequest.abort()
        }
    }, [room, roomId, groupPreview, dispatch, fedimint, replace])

    const handleJoinGroup = async () => {
        if (!canJoin || hasKnockedLocally) return
        setIsJoiningGroup(true)

        try {
            if (isPublic) {
                await joinPublicGroup(roomId)
                replace(chatRoomRoute(roomId))
            } else {
                await knockGroup(roomId)
                setHasKnockedLocally(true)
            }
        } catch {
            // joinPublicGroup throws if the room is already joined; knockGroup
            // surfaces its own error toast.
        } finally {
            setIsJoiningGroup(false)
        }
    }

    if (isAlreadyKnocked) {
        return (
            <KnockPendingView
                roomName={roomName}
                onGoBack={() => replace(chatRoute)}
            />
        )
    }

    if (isLoading || !groupPreview || room) {
        return (
            <Column center grow>
                <HoloLoader size="md" />
            </Column>
        )
    }

    return (
        <Layout.Root>
            <Layout.Header back />
            <Layout.Content>
                <Column grow center>
                    <Column center grow fullWidth gap="sm">
                        <ChatAvatar size="md" room={groupPreview.info} />
                        <Text variant="h2" weight="medium" center>
                            {isPublic
                                ? t(
                                      'feature.onboarding.welcome-to-federation',
                                      { federation: groupPreview.info.name },
                                  )
                                : roomName || t('feature.chat.join-a-group')}
                        </Text>
                        <Text center>
                            {isPublic
                                ? t('feature.chat.public-group-notice')
                                : canJoin
                                  ? t('feature.chat.private-group-notice')
                                  : t('feature.chat.invite-only-group-notice')}
                        </Text>
                    </Column>
                    {canJoin && (
                        <Column fullWidth>
                            <Button
                                width="full"
                                onClick={handleJoinGroup}
                                loading={isJoiningGroup}
                                disabled={isJoiningGroup}>
                                {isPublic
                                    ? t('words.continue')
                                    : t('feature.chat.request-to-join')}
                            </Button>
                        </Column>
                    )}
                </Column>
            </Layout.Content>
        </Layout.Root>
    )
}
