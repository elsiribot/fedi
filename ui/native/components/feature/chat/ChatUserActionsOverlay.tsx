import React, { useEffect } from 'react'

import {
    addMatrixUser,
    selectMatrixRoomMember,
    selectMatrixUser,
} from '@fedi/common/redux'

import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import CustomOverlay from '../../ui/CustomOverlay'
import HoloLoader from '../../ui/HoloLoader'
import ChatUserActions from './ChatUserActions'

interface Props {
    roomId: string
    selectedUserId: string | null
    show: boolean
    label: string
    onDismiss: () => void
}

export const ChatUserActionsOverlay: React.FC<Props> = ({
    roomId,
    selectedUserId,
    show,
    label = '',
    onDismiss,
}) => {
    const dispatch = useAppDispatch()
    const hasStoredUser = !!useAppSelector(s =>
        selectMatrixUser(s, selectedUserId ?? ''),
    )
    const member = useAppSelector(s =>
        selectMatrixRoomMember(s, roomId, selectedUserId ?? ''),
    )

    // this is so we can lookup the user in a direct chat
    useEffect(() => {
        if (hasStoredUser) return
        if (!member) return
        dispatch(
            addMatrixUser({
                id: member.id,
                displayName: member.displayName,
                avatarUrl: member.avatarUrl,
            }),
        )
    }, [dispatch, member, hasStoredUser])

    if (!selectedUserId) return <></>

    return (
        <CustomOverlay
            show={show}
            onBackdropPress={() => onDismiss()}
            contents={{
                title: label,
                body: !member ? (
                    <HoloLoader size={48} />
                ) : (
                    <ChatUserActions
                        member={member}
                        roomId={roomId}
                        dismiss={() => onDismiss()}
                    />
                ),
            }}
        />
    )
}
