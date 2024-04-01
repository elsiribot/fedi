import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useToast } from '@fedi/common/hooks/toast'
import {
    selectMatrixAuth,
    selectMatrixRoomSelfPowerLevel,
    setMatrixRoomMemberPowerLevel,
} from '@fedi/common/redux'
import { MatrixPowerLevel, MatrixRoomMember } from '@fedi/common/types'
import { makeLog } from '@fedi/common/utils/log'
import SvgImage, { SvgImageName } from '@fedi/native/components/ui/SvgImage'
import { useAppDispatch, useAppSelector } from '@fedi/native/state/hooks'

import ChatUserAction from './ChatUserAction'

export type Props = {
    roomId: string
    member: MatrixRoomMember
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

const log = makeLog('chat/ChatUserActions')

const ChatUserActions: React.FC<Props> = ({
    roomId,
    member,
    dismiss,
}: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const myUserId = useAppSelector(selectMatrixAuth)?.userId
    const myPowerLevel = useAppSelector(s =>
        selectMatrixRoomSelfPowerLevel(s, roomId),
    )
    const navigation = useNavigation()
    const dispatch = useAppDispatch()
    const { error, show } = useToast()
    const [changingPowerLevel, setChangingPowerLevel] =
        useState<MatrixPowerLevel | null>(null)

    const handleChangePowerLevel = async (
        userId: string,
        powerLevel: MatrixPowerLevel,
    ) => {
        setChangingPowerLevel(powerLevel)
        try {
            await dispatch(
                setMatrixRoomMemberPowerLevel({ roomId, userId, powerLevel }),
            ).unwrap()
            log.info(`Updated user's power level to ${powerLevel}`)
            show({
                content: t('feature.chat.change-role-success'),
                status: 'success',
            })
        } catch (err) {
            log.error("Failed to update user's power level", err)
            error(t, 'feature.chat.change-role-failure')
        }
        setChangingPowerLevel(null)
        dismiss()
    }

    const getRoleDisabled = (
        member: MatrixRoomMember,
        powerLevel: MatrixPowerLevel,
    ) => {
        if (!myUserId) return true
        // Cannot change your own role
        if (member.id === myUserId) return true
        // Cannot assign a role higher than your role
        if (myPowerLevel < powerLevel) return true
        // Cannot lower the role of a member with the same or greater role
        if (myPowerLevel <= member.powerLevel) return true
        // Cannot set the role to the current role
        if (member.powerLevel === powerLevel) return true
        return false
    }

    const actions: Action[] = [
        {
            id: 0,
            label: t('feature.chat.go-to-direct-chat'),
            icon: 'Chat',
            onPress: () => {
                navigation.navigate('ChatUserConversation', {
                    userId: member.id,
                })
                dismiss()
            },
        },
    ]

    const changeRoles: RoleChangeAction[] = [
        {
            id: 1,
            label: t('words.member'),
            powerLevel: MatrixPowerLevel.Member,
            icon: 'User',
            onPress: () =>
                handleChangePowerLevel(member.id, MatrixPowerLevel.Member),
        },
        {
            id: 2,
            label: t('words.moderator'),
            powerLevel: MatrixPowerLevel.Moderator,
            icon: 'ChatModerator',
            onPress: () =>
                handleChangePowerLevel(member.id, MatrixPowerLevel.Moderator),
        },
        {
            id: 3,
            label: t('words.admin'),
            powerLevel: MatrixPowerLevel.Admin,
            icon: 'ChatAdmin',
            onPress: () =>
                handleChangePowerLevel(member.id, MatrixPowerLevel.Admin),
        },
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
                    <ChatUserAction
                        key={action.id}
                        leftIcon={<SvgImage name={action.icon} />}
                        label={action.label}
                        onPress={() => action.onPress()}
                    />
                ))}
            </View>
            {/* Only show roles if the user is an admin */}
            {myPowerLevel >= MatrixPowerLevel.Moderator && (
                <View style={styles(theme).sectionContainer}>
                    <Text caption style={styles(theme).sectionTitle}>
                        {t('feature.chat.change-role')}
                    </Text>
                    {changeRoles.map(action => (
                        <ChatUserAction
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
                            isLoading={changingPowerLevel === action.powerLevel}
                        />
                    ))}
                </View>
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

export default ChatUserActions
