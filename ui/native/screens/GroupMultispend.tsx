import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { useMultispendDisplayUtils } from '@fedi/common/hooks/multispend'
import { selectMatrixRoomMultispendStatus } from '@fedi/common/redux'

import MultispendWalletHeader from '../components/feature/multispend/MultispendWalletHeader'
import MultispendFinalized from '../components/feature/multispend/finalized/MultispendFinalized'
import MultispendActiveInvitation from '../components/feature/multispend/invitation/MultispendActiveInvitation'
import { useAppSelector } from '../state/hooks'
import { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'GroupMultispend'
>

const GroupMultispend: React.FC<Props> = ({ route }: Props) => {
    const { roomId } = route.params
    const multispendStatus = useAppSelector(s =>
        selectMatrixRoomMultispendStatus(s, roomId),
    )

    const { t } = useTranslation()
    const { shouldShowHeader } = useMultispendDisplayUtils(t, roomId)

    if (!multispendStatus) return null

    return (
        <View style={{ flex: 1 }}>
            {shouldShowHeader && <MultispendWalletHeader roomId={roomId} />}
            {multispendStatus.status === 'activeInvitation' && (
                <MultispendActiveInvitation roomId={roomId} />
            )}
            {multispendStatus.status === 'finalized' && (
                <MultispendFinalized roomId={roomId} />
            )}
        </View>
    )
}

export default GroupMultispend
