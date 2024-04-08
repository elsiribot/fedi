import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Switch, Text, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Alert,
    ImageBackground,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native'

import { useToast } from '@fedi/common/hooks/toast'
import {
    leaveMatrixRoom,
    selectMatrixRoom,
    selectMatrixRoomMembersCount,
    selectMatrixRoomSelfPowerLevel,
    setMatrixRoomBroadcastOnly,
} from '@fedi/common/redux'
import { MatrixPowerLevel } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { Images } from '../assets/images'
import SettingsItem from '../components/feature/admin/SettingsItem'
import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'GroupAdmin'>

const GroupAdmin: React.FC<Props> = ({ navigation, route }: Props) => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const { theme } = useTheme()
    const toast = useToast()
    const { roomId } = route.params
    const room = useAppSelector(s => selectMatrixRoom(s, roomId))
    const memberCount = useAppSelector(s =>
        selectMatrixRoomMembersCount(s, roomId),
    )
    const myPowerLevel = useAppSelector(s =>
        selectMatrixRoomSelfPowerLevel(s, room?.id || ''),
    )
    const isAdmin = myPowerLevel >= MatrixPowerLevel.Admin
    // const myAffiliation = useAppSelector(s =>
    //     selectChatGroupAffiliation(s, groupId),
    // )
    // TODO: Reimplement with matrix
    const isDefaultGroup = false
    // const isDefaultGroup = useAppSelector(s =>
    //     selectChatDefaultGroupIds(s).includes(groupId),
    // )
    const [isTogglingBroadcastOnly, setIsTogglingBroadcastOnly] =
        useState(false)

    const leaveGroup = useCallback(async () => {
        // Immediately navigate and replace navigation stack on leave
        // attempt, otherwise pressing the back button or useEffects in
        // backgrounded screens may attempt to re-join the group right
        // after we leave it.
        try {
            navigation.replace('TabsNavigator')
            await dispatch(leaveMatrixRoom({ roomId })).unwrap()
        } catch (err) {
            toast.error(t, err)
        }
    }, [dispatch, navigation, roomId, t, toast])

    const handleLeaveGroup = useCallback(() => {
        Alert.alert(
            t('feature.chat.leave-group'),
            t('feature.chat.leave-group-confirmation'),
            [
                {
                    text: t('words.cancel'),
                },
                {
                    text: t('words.yes'),
                    onPress: () => leaveGroup(),
                },
            ],
        )
    }, [leaveGroup, t])

    const handleChangeGroupName = useCallback(() => {
        navigation.navigate('EditGroup', { roomId })
    }, [navigation, roomId])

    const handleViewMembers = useCallback(() => {
        navigation.navigate('ChatRoomMembers', { roomId })
    }, [navigation, roomId])

    const handleInviteMember = useCallback(() => {
        navigation.navigate('ChatRoomInvite', { roomId })
    }, [navigation, roomId])

    const handleToggleBroadcastOnly = useCallback(async () => {
        if (isTogglingBroadcastOnly || !room) return
        setIsTogglingBroadcastOnly(true)
        try {
            await dispatch(
                setMatrixRoomBroadcastOnly({
                    roomId: room.id,
                    broadcastOnly: !room.broadcastOnly,
                }),
            ).unwrap()
        } catch (err) {
            toast.error(t, 'errors.unknown-error')
        }
        setIsTogglingBroadcastOnly(false)
    }, [isTogglingBroadcastOnly, room, dispatch, toast, t])

    return (
        <ScrollView contentContainerStyle={styles(theme).container}>
            <View style={styles(theme).profileHeader}>
                <ImageBackground
                    source={Images.HoloBackground}
                    style={styles(theme).profileCircle}
                    imageStyle={styles(theme).circleBorder}>
                    <SvgImage
                        name={room?.broadcastOnly ? 'SpeakerPhone' : 'Room'}
                        size={SvgImageSize.md}
                    />
                </ImageBackground>
                <Text h2 style={styles(theme).groupNameText}>
                    {room?.name || ''}
                </Text>
            </View>
            <View style={styles(theme).sectionContainer}>
                <Text style={styles(theme).sectionTitle}>
                    {t('words.group')}
                </Text>
                <SettingsItem
                    image={<SvgImage name="SocialPeople" />}
                    label={`${amountUtils.formatNumber(memberCount)} ${t(
                        'words.members',
                    )}`}
                    onPress={handleViewMembers}
                />
                <SettingsItem
                    image={<SvgImage name="Room" />}
                    label={t('feature.chat.invite-to-group')}
                    onPress={handleInviteMember}
                    disabled={!isAdmin}
                />
                <SettingsItem
                    image={<SvgImage name="LeaveRoom" />}
                    label={t('feature.chat.leave-group')}
                    onPress={handleLeaveGroup}
                    disabled={isDefaultGroup}
                />
                <SettingsItem
                    image={<SvgImage name="Edit" />}
                    label={t('feature.chat.change-group-name')}
                    onPress={handleChangeGroupName}
                    disabled={!isAdmin}
                />
                <SettingsItem
                    image={<SvgImage name="SpeakerPhone" />}
                    label={t('feature.chat.broadcast-only')}
                    action={
                        <Switch
                            value={room?.broadcastOnly}
                            disabled={isTogglingBroadcastOnly || !isAdmin}
                            onValueChange={_ => {
                                handleToggleBroadcastOnly()
                            }}
                        />
                    }
                    disabled={!isAdmin}
                    onPress={handleToggleBroadcastOnly}
                />
            </View>
        </ScrollView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            justifyContent: 'space-evenly',
            padding: theme.spacing.xl,
        },
        profileHeader: {
            alignItems: 'center',
            paddingBottom: theme.spacing.lg,
        },
        profileCircle: {
            height: theme.sizes.adminProfileCircle,
            width: theme.sizes.adminProfileCircle,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.md,
        },
        circleBorder: {
            borderRadius: theme.sizes.adminProfileCircle * 0.5,
        },
        groupNameText: {
            textAlign: 'center',
        },
        groupIcon: {
            height: theme.sizes.md,
            width: theme.sizes.md,
        },
        sectionContainer: {
            flexDirection: 'column',
            alignItems: 'flex-start',
        },
        sectionTitle: {
            color: theme.colors.primaryLight,
            paddingVertical: theme.spacing.sm,
        },
        settingsItemArrow: {
            alignSelf: 'flex-end',
        },
    })

export default GroupAdmin
