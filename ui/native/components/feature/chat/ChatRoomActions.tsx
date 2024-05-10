import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useToast } from '@fedi/common/hooks/toast'
import {
    banUser,
    kickUser,
    selectMatrixAuth,
    selectMatrixRoomSelfPowerLevel,
    setMatrixRoomMemberPowerLevel,
} from '@fedi/common/redux'
import { MatrixPowerLevel, MatrixRoomMember } from '@fedi/common/types'
import { makeLog } from '@fedi/common/utils/log'
import { matrixIdToUsername } from '@fedi/common/utils/matrix'
import SvgImage, { SvgImageName } from '@fedi/native/components/ui/SvgImage'
import { useAppDispatch, useAppSelector } from '@fedi/native/state/hooks'

import ChatRoomAction from './ChatRoomAction'

export type Props = {
    room: MatrixRoom
    dismiss: () => void
}

type Action = {
    id: number
    label: string
    icon: SvgImageName
    onPress: () => void
}
type RoleChangeAction = Action & {
    powerLevel: MatrixPowerLevel
}

type ModerationAction = Action & {
    reason?: string
}

const log = makeLog('chat/ChatRoomActions')

const ChatRoomActions: React.FC<Props> = ({ room, dismiss }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const myPowerLevel = useAppSelector(s =>
        selectMatrixRoomSelfPowerLevel(s, room.id),
    )
    const navigation = useNavigation()
    const dispatch = useAppDispatch()
    const { error, show } = useToast()
    const [loadingAction, setLoadingAction] = useState<number | null>(null)

    const actions: Action[] = [
        {
            id: 0,
            label: t('feature.chat.go-to-direct-chat'),
            icon: 'Chat',
            onPress: () => {
                navigation.navigate('ChatRoomConversation', {
                    userId: member.id,
                    displayName:
                        member.displayName ?? matrixIdToUsername(member.id),
                })
                dismiss()
            },
        },
    ]
    const handleMuteRoom = async () => {
        setLoadingAction(1)
        try {
            log.info(`Muting room ${room.id}`)
            await dispatch(banUser({ roomId, userId, reason })).unwrap()
            show({
                content: t('feature.chat.user-ban-success'),
                status: 'success',
            })
        } catch (err) {
            log.error('Failed to ban user from room', err)
            error(t, 'feature.errors.failed-to-ban-user')
        }
        setLoadingAction(null)
        dismiss()
    }

    const changeRoles: RoleChangeAction[] = [
        {
            id: 1,
            label: t('words.member'),
            powerLevel: MatrixPowerLevel.Member,
            icon: 'User',
            onPress: () =>
                handleChangePowerLevel(member.id, MatrixPowerLevel.Member, 1),
        },
        {
            id: 2,
            label: t('words.moderator'),
            powerLevel: MatrixPowerLevel.Moderator,
            icon: 'ChatModerator',
            onPress: () =>
                handleChangePowerLevel(
                    member.id,
                    MatrixPowerLevel.Moderator,
                    2,
                ),
        },
        {
            id: 3,
            label: t('words.admin'),
            powerLevel: MatrixPowerLevel.Admin,
            icon: 'ChatAdmin',
            onPress: () =>
                handleChangePowerLevel(member.id, MatrixPowerLevel.Admin, 3),
        },
    ]

    const moderationActions: ModerationAction[] = [
        {
            id: 4,
            label: t('feature.chat.remove-user'),
            icon: 'KickMember',
            onPress: () => handleRemoveUser(member.id, 4),
        },
        {
            id: 5,
            label: t('feature.chat.ban-user'),
            icon: 'BlockMember',
            onPress: () => handleBanUser(member.id, 5),
        },
        // TODO: Block from this screen?
        // TODO: Temporary Mute?
        // {
        //     id: 6,
        //     label: t('words.admin'),
        //     icon: 'ChatAdmin',
        //     onPress: () =>
        //         handleChangePowerLevel(member.id, MatrixPowerLevel.Admin),
        // },
    ]

    const getColor = (action: RoleChangeAction) =>
        member.powerLevel === action.powerLevel ? theme.colors.blue : undefined

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).sectionContainer}>
                <Text caption style={styles(theme).sectionTitle}>
                    {t('words.actions')}
                </Text>
                {actions.map(action => (
                    <ChatRoomAction
                        key={action.id}
                        leftIcon={<SvgImage name={action.icon} />}
                        rightIcon={<SvgImage name={'ChevronRight'} />}
                        label={action.label}
                        onPress={() => action.onPress()}
                    />
                ))}
            </View>
            {/* Only show roles if the user is an admin */}
            {myPowerLevel >= MatrixPowerLevel.Moderator && (
                <>
                    <View style={styles(theme).sectionContainer}>
                        <Text caption style={styles(theme).sectionTitle}>
                            {t('feature.chat.change-role')}
                        </Text>
                        {changeRoles.map(action => (
                            <ChatRoomAction
                                key={action.id}
                                leftIcon={
                                    <SvgImage
                                        name={action.icon}
                                        color={getColor(action)}
                                    />
                                }
                                rightIcon={
                                    member.powerLevel === action.powerLevel && (
                                        <SvgImage
                                            name={'Check'}
                                            color={getColor(action)}
                                        />
                                    )
                                }
                                label={action.label}
                                onPress={() => action.onPress()}
                                disabled={getRoleDisabled(
                                    member,
                                    action.powerLevel,
                                )}
                                active={action.powerLevel === member.powerLevel}
                                isLoading={loadingAction === action.id}
                            />
                        ))}
                    </View>
                </>
            )}
            {/* Only show roles if the user is an admin */}
            {myPowerLevel >= MatrixPowerLevel.Moderator && (
                <>
                    <View style={styles(theme).sectionContainer}>
                        <Text caption style={styles(theme).sectionTitle}>
                            {t('phrases.moderation-tools')}
                        </Text>
                        {moderationActions.map(action => (
                            <ChatRoomAction
                                key={action.id}
                                leftIcon={
                                    <SvgImage
                                        name={action.icon}
                                        color={theme.colors.red}
                                    />
                                }
                                label={action.label}
                                labelColor={theme.colors.red}
                                onPress={() => action.onPress()}
                                disabled={getRoleDisabled(member)}
                                isLoading={loadingAction === action.id}
                            />
                        ))}
                    </View>
                </>
            )}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            justifyContent: 'space-evenly',
            alignItems: 'center',
            padding: theme.spacing.lg,
            paddingTop: 0,
        },
        profileHeader: {
            alignItems: 'center',
            padding: theme.spacing.lg,
            borderRadius: theme.borders.defaultRadius,
            borderColor: theme.colors.primaryLight,
        },
        actionsContainer: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignSelf: 'flex-start',
        },
        sectionContainer: {
            flexDirection: 'column',
            alignItems: 'flex-start',
        },
        sectionTitle: {
            color: theme.colors.primaryLight,
            paddingVertical: theme.spacing.sm,
        },
        versionContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.offWhite,
            padding: theme.spacing.md,
            borderRadius: theme.borders.defaultRadius,
            marginTop: theme.spacing.md,
        },
        logo: {
            marginBottom: theme.spacing.sm,
        },
    })

export default ChatRoomActions
