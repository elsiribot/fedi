import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, ListRenderItem, StyleSheet, View } from 'react-native'

import {
    selectMatrixAuth,
    selectMatrixRoomMembers,
    selectMatrixRoomSelfPowerLevel,
} from '@fedi/common/redux'
import { MatrixPowerLevel, MatrixRoomMember } from '@fedi/common/types'
import { makeLog } from '@fedi/common/utils/log'
import { sortMembersByMe } from '@fedi/common/utils/matrix'

import { ChatUserActionsOverlay } from '../components/feature/chat/ChatUserActionsOverlay'
import ChatUserTile from '../components/feature/chat/ChatUserTile'
import { useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

const log = makeLog('ChatRoomMembers')

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ChatRoomMembers'
>

const ChatRoomMembers: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { roomId } = route.params
    const { theme } = useTheme()

    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
    const myUserId = useAppSelector(selectMatrixAuth)?.userId
    const unsortedMembers = useAppSelector(s =>
        selectMatrixRoomMembers(s, roomId),
    )
    const [isRefetching, setIsRefetching] = useState(false)
    // Make the current user appear at the top
    const members = useMemo(
        () =>
            myUserId === undefined
                ? unsortedMembers
                : sortMembersByMe(myUserId, unsortedMembers),
        [myUserId, unsortedMembers, sortMembersByMe],
    )
    const myPowerLevel = useAppSelector(s =>
        selectMatrixRoomSelfPowerLevel(s, roomId),
    )

    const handleSelectMember = useCallback((userId: string) => {
        setSelectedUserId(userId)
    }, [])

    const handleRefresh = useCallback(() => {
        setIsRefetching(true)
        setTimeout(() => setIsRefetching(false), 500)
    }, [])

    const renderMember: ListRenderItem<MatrixRoomMember> = ({ item }) => {
        const isMe = item.id === myUserId
        const displayName = isMe ? t('words.you') : item.displayName
        const member = { ...item, displayName }

        return (
            <ChatUserTile
                user={member}
                selectUser={handleSelectMember}
                disabled={isMe}
                rightIcon={
                    <Text small color={theme.colors.grey}>
                        {member.powerLevel >= MatrixPowerLevel.Admin
                            ? t('words.admin')
                            : member.powerLevel >= MatrixPowerLevel.Moderator
                            ? t('words.moderator')
                            : t('words.member')}
                    </Text>
                }
            />
        )
    }

    const style = styles(theme)

    return (
        <View style={style.container}>
            <Text h2 h2Style={style.headerText}>
                {t('words.members')}
            </Text>
            <FlatList
                data={members}
                renderItem={renderMember}
                keyExtractor={(item: MatrixRoomMember) => `${item.id}`}
                contentContainerStyle={style.membersListContainer}
                onRefresh={handleRefresh}
                refreshing={isRefetching}
                showsVerticalScrollIndicator={false}
            />
            <ChatUserActionsOverlay
                show={selectedUserId !== null}
                onDismiss={() => setSelectedUserId(null)}
                label={selectedUserId ?? ''}
                selectedUserId={selectedUserId}
                roomId={roomId}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            width: '100%',
            padding: theme.spacing.lg,
        },
        headerText: {
            marginBottom: theme.spacing.sm,
        },
        instructions: {
            lineHeight: 20,
        },
        membersListContainer: {},
        buttonContainer: {
            marginTop: 'auto',
        },
    })

export default ChatRoomMembers
