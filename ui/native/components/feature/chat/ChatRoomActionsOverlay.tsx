import React, { useEffect } from 'react'

import {
    addMatrixUser,
    selectMatrixRoom,
    selectMatrixRoomMember,
    selectMatrixUser,
} from '@fedi/common/redux'

import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import CustomOverlay from '../../ui/CustomOverlay'
import HoloLoader from '../../ui/HoloLoader'
import ChatRoomActions from './ChatRoomActions'

interface Props {
    selectedRoomId: string | null
    show: boolean
    onDismiss: () => void
}

export const ChatRoomActionsOverlay: React.FC<Props> = ({
    selectedRoomId,
    show,
    onDismiss,
}) => {
    const dispatch = useAppDispatch()
    const hasStoredUser = !!useAppSelector(s =>
        selectMatrixUser(s, selectedRoomId ?? ''),
    )
    const room = useAppSelector(s => selectMatrixRoom(s, selectedRoomId ?? ''))

    // // this is so we can lookup the user in a direct chat
    // useEffect(() => {
    //     if (hasStoredUser) return
    //     if (!room) return
    //     dispatch(
    //         addMatrixUser({
    //             id: member.id,
    //             displayName: member.displayName,
    //             avatarUrl: member.avatarUrl,
    //         }),
    //     )
    // }, [dispatch, room, hasStoredUser])

    if (!selectedRoomId) return <></>

    return (
        <CustomOverlay
            show={show}
            onBackdropPress={() => onDismiss()}
            contents={{
                title: room?.name ?? '',
                body: !room ? (
                    <HoloLoader size={48} />
                ) : (
                    <ChatRoomActions room={room} dismiss={() => onDismiss()} />
                ),
            }}
        />
    )
}
