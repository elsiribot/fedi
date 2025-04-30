import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'

import { useObserveMultispendAccountInfo } from '@fedi/common/hooks/matrix'
import { useMultispendDisplayUtils } from '@fedi/common/hooks/multispend'
import { selectMatrixRoomMultispendStatus } from '@fedi/common/redux'

import FederationGate from '../components/feature/federations/FederationGate'
import MultispendWalletHeader from '../components/feature/multispend/MultispendWalletHeader'
import MultispendFinalized from '../components/feature/multispend/finalized/MultispendFinalized'
import MultispendActiveInvitation from '../components/feature/multispend/invitation/MultispendActiveInvitation'
import Flex from '../components/ui/Flex'
import { useAppSelector } from '../state/hooks'
import { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'GroupMultispend'
>

const GroupMultispend: React.FC<Props> = ({ route }: Props) => {
    const { roomId } = route.params

    useObserveMultispendAccountInfo(roomId)

    const multispendStatus = useAppSelector(s =>
        selectMatrixRoomMultispendStatus(s, roomId),
    )

    const { t } = useTranslation()
    const { shouldShowHeader } = useMultispendDisplayUtils(t, roomId)

    if (!multispendStatus) return null

    const inviteCode =
        multispendStatus.status === 'activeInvitation'
            ? multispendStatus.state.invitation.federationInviteCode
            : multispendStatus.finalized_group.invitation.federationInviteCode

    return (
        <FederationGate inviteCode={inviteCode}>
            <Flex grow>
                {shouldShowHeader && <MultispendWalletHeader roomId={roomId} />}
                {multispendStatus.status === 'activeInvitation' && (
                    <MultispendActiveInvitation roomId={roomId} />
                )}
                {multispendStatus.status === 'finalized' && (
                    <MultispendFinalized roomId={roomId} />
                )}
            </Flex>
        </FederationGate>
    )
}

export default GroupMultispend
