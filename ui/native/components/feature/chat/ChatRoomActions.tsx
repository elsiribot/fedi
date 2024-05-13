import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useToast } from '@fedi/common/hooks/toast'
import {
    selectMatrixRoomNotificationMode,
    updateMatrixRoomNotificationMode,
} from '@fedi/common/redux'
import { MatrixRoom } from '@fedi/common/types'
import { RpcRoomNotificationMode } from '@fedi/common/types/bindings'
import { makeLog } from '@fedi/common/utils/log'
import SvgImage, { SvgImageName } from '@fedi/native/components/ui/SvgImage'
import { useAppDispatch, useAppSelector } from '@fedi/native/state/hooks'

import ChatRoomAction from './ChatAction'

export type Props = {
    room: MatrixRoom
    dismiss: () => void
}

type Action = {
    id: number
    dataId?: string
    label: string
    icon: SvgImageName
    onPress: () => void
}

const log = makeLog('chat/ChatRoomActions')

const ChatRoomActions: React.FC<Props> = ({ room, dismiss }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation()
    const dispatch = useAppDispatch()
    const { error, show } = useToast()
    const [loadingAction, setLoadingAction] = useState<number | null>(null)
    const notificationMode = useAppSelector(s =>
        selectMatrixRoomNotificationMode(s, room.id),
    )

    const actions: Action[] = [
        {
            id: 0,
            label: t('feature.notifications.open-chat'),
            icon: 'Chat',
            onPress: async () => {
                setLoadingAction(0)
                navigation.navigate('ChatRoomConversation', {
                    roomId: room.id,
                })
                dismiss()
                setLoadingAction(null)
            },
        },
    ]
    const handleUpdateNotificationMode = async (
        id: number,
        mode: RpcRoomNotificationMode,
    ) => {
        setLoadingAction(id)
        try {
            log.info(`Muting room ${room.id}`)
            await dispatch(
                updateMatrixRoomNotificationMode({ roomId: room.id, mode }),
            ).unwrap()
            show({
                content: t('feature.chat.notification-update-success'),
                status: 'success',
            })
        } catch (err) {
            log.error('Failed to ban user from room', err)
            error(t, 'feature.errors.failed-to-ban-user')
        }
        setLoadingAction(null)
        dismiss()
    }

    const notificationActions: Action[] = [
        {
            id: 1,
            dataId: 'allMessages',
            label: t('feature.chat.notification-always'),
            icon: 'Bell',
            onPress: () => handleUpdateNotificationMode(1, 'allMessages'),
        },
        {
            id: 2,
            label: t('feature.chat.notification-mentions'),
            dataId: 'mentionsAndKeywordsOnly',
            icon: 'User',
            onPress: () =>
                handleUpdateNotificationMode(2, 'mentionsAndKeywordsOnly'),
        },
        {
            id: 3,
            label: t('feature.chat.notification-mute'),
            dataId: 'mute',
            icon: 'Close',
            onPress: () => handleUpdateNotificationMode(3, 'mute'),
        },
    ]

    // const moderationActions: ModerationAction[] = [
    //     {
    //         id: 4,
    //         label: t('feature.chat.remove-user'),
    //         icon: 'KickMember',
    //         onPress: () => handleRemoveUser(member.id, 4),
    //     },
    //     {
    //         id: 5,
    //         label: t('feature.chat.ban-user'),
    //         icon: 'BlockMember',
    //         onPress: () => handleBanUser(member.id, 5),
    //     },
    // TODO: Block from this screen?
    // TODO: Temporary Mute?
    // {
    //     id: 6,
    //     label: t('words.admin'),
    //     icon: 'ChatAdmin',
    //     onPress: () =>
    //         handleChangePowerLevel(member.id, MatrixPowerLevel.Admin),
    // },
    // ]

    const getIsDisabled = (dataId?: string) => {
        if (!dataId) return true
        if (dataId === notificationMode) return true
        return false
    }

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
                        isLoading={loadingAction === action.id}
                        onPress={() => action.onPress()}
                    />
                ))}
            </View>
            <View style={styles(theme).sectionContainer}>
                <Text caption style={styles(theme).sectionTitle}>
                    {t('feature.chat.notification-settings')}
                </Text>
                {notificationActions.map(action => (
                    <ChatRoomAction
                        key={action.id}
                        leftIcon={
                            <SvgImage
                                name={action.icon}
                                color={theme.colors.blue}
                            />
                        }
                        label={action.label}
                        labelColor={theme.colors.blue}
                        onPress={() => action.onPress()}
                        disabled={getIsDisabled(action.dataId)}
                        disabledStyle={{}}
                        active={action.dataId === notificationMode}
                        isLoading={loadingAction === action.id}
                        rightIcon={
                            action.dataId === notificationMode && (
                                <SvgImage
                                    name={'Check'}
                                    // color={theme.colors.blue}
                                />
                            )
                        }
                    />
                ))}
            </View>
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
