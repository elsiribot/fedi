import React from 'react'

import { selectMatrixRoom } from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
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
    const room = useAppSelector(s => selectMatrixRoom(s, selectedRoomId ?? ''))

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
