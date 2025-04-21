import { NativeStackScreenProps } from '@react-navigation/native-stack'

import MultispendWalletHeader from '../components/feature/multispend/MultispendWalletHeader'
import { SafeAreaContainer } from '../components/ui/SafeArea'
import { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'GroupMultispend'
>

const GroupMultispend: React.FC<Props> = ({ route }: Props) => {
    const { roomId } = route.params

    return (
        <SafeAreaContainer edges="bottom">
            <MultispendWalletHeader roomId={roomId} />
        </SafeAreaContainer>
    )
}

export default GroupMultispend
