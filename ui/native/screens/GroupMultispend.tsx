import { useNavigation } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import { useEffect, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import {
    selectMatrixAuth,
    selectMatrixRoomMultispendStatus,
    selectMyMultispendRole,
} from '@fedi/common/redux'

import AcceptMultispendInvitation from '../components/feature/multispend/AcceptMultispendInvitation'
import GroupVoters from '../components/feature/multispend/GroupVoters'
import MultispendWalletHeader from '../components/feature/multispend/MultispendWalletHeader'
import { SafeAreaContainer } from '../components/ui/SafeArea'
import { useAppSelector } from '../state/hooks'
import { reset } from '../state/navigation'
import { MultispendActiveInvitation } from '../types'
import { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'GroupMultispend'
>

const GroupMultispend: React.FC<Props> = ({ route }: Props) => {
    const { roomId } = route.params
    const myId = useAppSelector(selectMatrixAuth)?.userId
    const multispendStatus = useAppSelector(s =>
        selectMatrixRoomMultispendStatus(s, roomId),
    )
    const myMultispendRole = useAppSelector(s =>
        selectMyMultispendRole(s, roomId),
    )
    const navigation = useNavigation()
    const { theme } = useTheme()

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

    const style = styles(theme)

    // If the multispend group is aborted by the admin, navigate back to chat
    useEffect(() => {
        if (multispendStatus?.status === 'inactive') {
            navigation.dispatch(reset('ChatRoomConversation', { roomId }))
        }
    }, [multispendStatus, roomId, navigation])

    return (
        <SafeAreaContainer edges="bottom">
            <MultispendWalletHeader roomId={roomId} />
            <View style={style.container}>
                <GroupVoters roomId={roomId} />
                {canAccept && (
                    <AcceptMultispendInvitation
                        roomId={roomId}
                        multispendStatus={
                            multispendStatus as MultispendActiveInvitation
                        }
                    />
                )}
            </View>
        </SafeAreaContainer>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            gap: theme.spacing.lg,
        },
    })

export default GroupMultispend
