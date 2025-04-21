import { useNavigation } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button } from '@rneui/themed'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast } from '@fedi/common/hooks/toast'
import {
    matrixApproveMultispendInvitation,
    selectMatrixAuth,
    selectMatrixRoomMultispendStatus,
    selectMyMultispendRole,
} from '@fedi/common/redux'

import { fedimint } from '../bridge'
import GroupVoters from '../components/feature/multispend/GroupVoters'
import MultispendWalletHeader from '../components/feature/multispend/MultispendWalletHeader'
import { SafeAreaContainer } from '../components/ui/SafeArea'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import { reset } from '../state/navigation'
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
    const myMultispendRole = useAppSelector(s =>
        selectMyMultispendRole(s, roomId),
    )
    const dispatch = useAppDispatch()
    const navigation = useNavigation()
    const toast = useToast()

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

    // If the multispend group is aborted by the admin, navigate back to chat
    useEffect(() => {
        if (multispendStatus?.status === 'inactive') {
            navigation.dispatch(reset('ChatRoomConversation', { roomId }))
        }
    }, [multispendStatus, roomId, navigation])

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
