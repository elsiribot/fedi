import { useNavigation } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'

import {
    useMultispendDisplayUtils,
    useMultispendVoting,
} from '@fedi/common/hooks/multispend'

import { fedimint } from '../bridge'
import AcceptMultispendInvitation from '../components/feature/multispend/AcceptMultispendInvitation'
import GroupVoters from '../components/feature/multispend/GroupVoters'
import MultispendWalletHeader from '../components/feature/multispend/MultispendWalletHeader'
import { SafeAreaContainer } from '../components/ui/SafeArea'
import { reset } from '../state/navigation'
import { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'GroupMultispend'
>

const GroupMultispend: React.FC<Props> = ({ route }: Props) => {
    const { roomId } = route.params
    const { t } = useTranslation()
    const navigation = useNavigation()
    const { canAccept } = useMultispendVoting({
        t,
        fedimint,
        roomId,
        onMultispendAborted: () => {
            navigation.dispatch(reset('ChatRoomConversation', { roomId }))
        },
    })

    const { shouldShowHeader } = useMultispendDisplayUtils(t, roomId)

    return (
        <SafeAreaContainer edges="bottom">
            {shouldShowHeader && <MultispendWalletHeader roomId={roomId} />}
            <GroupVoters roomId={roomId} />
            <SafeAreaContainer edges="horizontal" style={{ flex: 0 }}>
                {canAccept && <AcceptMultispendInvitation roomId={roomId} />}
            </SafeAreaContainer>
        </SafeAreaContainer>
    )
}

export default GroupMultispend
