import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button } from '@rneui/themed'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast } from '@fedi/common/hooks/toast'
import {
    matrixApproveMultispendInvitation,
    selectMatrixAuth,
    selectMatrixRoomMultispendStatus,
    selectMyMultispendPowerLevel,
} from '@fedi/common/redux'

import { fedimint } from '../bridge'
import GroupVoters from '../components/feature/multispend/GroupVoters'
import MultispendWalletHeader from '../components/feature/multispend/MultispendWalletHeader'
import { SafeAreaContainer } from '../components/ui/SafeArea'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import { MultispendPowerLevel } from '../types'
import { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'GroupMultispend'
>

const GroupMultispend: React.FC<Props> = ({ route }: Props) => {
    const [voting, setVoting] = useState(false)
    const { roomId } = route.params
    const { t } = useTranslation()
    const myId = useAppSelector(selectMatrixAuth)?.userId
    const multispendStatus = useAppSelector(s =>
        selectMatrixRoomMultispendStatus(s, roomId),
    )
    const myMultispendPowerLevel = useAppSelector(s =>
        selectMyMultispendPowerLevel(s, roomId),
    )
    const dispatch = useAppDispatch()
    const toast = useToast()

    const canAccept = useMemo(() => {
        if (
            multispendStatus?.status !== 'activeInvitation' ||
            !myId ||
            myMultispendPowerLevel !== MultispendPowerLevel.Voter
        )
            return false

        const hasRejected = multispendStatus.state.rejections.includes(myId)
        const hasApproved = Object.values(
            multispendStatus.state.pubkeys,
        ).includes(myId)

        return !hasRejected && !hasApproved
    }, [multispendStatus, myId, myMultispendPowerLevel])

    const handleAccept = useCallback(async () => {
        try {
            setVoting(true)
            await dispatch(
                matrixApproveMultispendInvitation({
                    fedimint,
                    roomId,
                }),
            ).unwrap()
        } catch (e) {
            toast.error(t, e)
        } finally {
            setVoting(false)
        }
    }, [toast, t, roomId, dispatch])

    return (
        <SafeAreaContainer edges="bottom">
            <MultispendWalletHeader roomId={roomId} />
            <GroupVoters roomId={roomId} />
            <SafeAreaContainer edges="horizontal" style={{ flex: 0 }}>
                {canAccept && (
                    <Button onPress={handleAccept} disabled={voting}>
                        {t('words.accept')}
                    </Button>
                )}
            </SafeAreaContainer>
        </SafeAreaContainer>
    )
}

export default GroupMultispend
