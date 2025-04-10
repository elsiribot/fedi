import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import LinearGradient from 'react-native-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useToast } from '@fedi/common/hooks/toast'
import {
    matrixRejectMultispendInvitation,
    selectMatrixRoomMultispendStatus,
    selectMyMultispendPowerLevel,
} from '@fedi/common/redux'
import { GroupInvitationWithKeys } from '@fedi/common/types/bindings'

import { fedimint } from '../../../bridge'
import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import { reset } from '../../../state/navigation'
import { MultispendPowerLevel } from '../../../types'
import CustomOverlay from '../../ui/CustomOverlay'
import HoloCircle from '../../ui/HoloCircle'
import HoloGradient from '../../ui/HoloGradient'
import SvgImage from '../../ui/SvgImage'

type Props = {
    roomId: string
}

const MultispendWalletHeader: React.FC<Props> = ({ roomId }) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const style = styles(theme)
    const navigation = useNavigation()
    const insets = useSafeAreaInsets()
    const multispendStatus = useAppSelector(s =>
        selectMatrixRoomMultispendStatus(s, roomId),
    )
    const myMultispendPowerLevel = useAppSelector(s =>
        selectMyMultispendPowerLevel(s, roomId),
    )
    const [isConfirmingAbort, setIsConfirmingAbort] = useState(false)
    const [activeInvitation, setActiveInvitation] =
        useState<GroupInvitationWithKeys | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const toast = useToast()
    const dispatch = useAppDispatch()

    const isAdmin = myMultispendPowerLevel === MultispendPowerLevel.Admin

    const handleBack = useCallback(() => {
        navigation.dispatch(reset('ChatRoomConversation', { roomId }))
    }, [navigation, roomId])

    const handleAbortMultispend = useCallback(async () => {
        if (!isAdmin) return

        setIsLoading(true)
        try {
            await fedimint.matrixCancelMultispendGroupInvitation({
                roomId,
            })
            navigation.dispatch(
                reset('ChatRoomConversation', {
                    roomId,
                }),
            )
        } catch (e) {
            toast.error(t, e)
        } finally {
            setIsLoading(false)
        }
    }, [navigation, roomId, t, toast, isAdmin])

    const handleRejectMultispend = useCallback(async () => {
        if (isAdmin) return

        setIsLoading(true)
        try {
            await dispatch(
                matrixRejectMultispendInvitation({ roomId, fedimint }),
            ).unwrap()
            navigation.dispatch(
                reset('ChatRoomConversation', {
                    roomId,
                }),
            )
        } catch (e) {
            toast.error(t, e)
        } finally {
            setIsLoading(false)
        }
    }, [isAdmin, dispatch, roomId, t, toast, navigation])

    const handleInfoPress = useCallback(() => {
        Linking.openURL(
            'https://support.fedi.xyz/hc/en-us/articles/20019791912466-What-is-Multispend',
        )
    }, [])

    useEffect(() => {
        async function loadActiveInvitation() {
            if (multispendStatus?.status === 'activeInvitation') {
                const eventData = await fedimint.matrixMultispendEventData({
                    roomId,
                    eventId: multispendStatus.active_invite_id,
                })
                if (
                    eventData &&
                    eventData !== 'invalidEvent' &&
                    'groupInvitation' in eventData
                ) {
                    setActiveInvitation(eventData.groupInvitation)
                }
            }
        }

        loadActiveInvitation()
    }, [multispendStatus, roomId])

    if (multispendStatus?.status !== 'activeInvitation') return null

    return (
        <HoloGradient style={style.container} level="m500">
            <View style={[style.header, { paddingTop: insets.top }]}>
                <Pressable onPress={handleBack}>
                    <SvgImage name="ChevronLeft" size={24} />
                </Pressable>
                <View style={style.title}>
                    <Text medium>{t('words.multispend')}</Text>
                    <Pressable onPress={handleInfoPress}>
                        <SvgImage
                            name="Info"
                            size={16}
                            color={theme.colors.grey}
                        />
                    </Pressable>
                </View>
                <Pressable onPress={() => setIsConfirmingAbort(true)}>
                    <Text style={style.abortText} medium>
                        {t(
                            myMultispendPowerLevel ===
                                MultispendPowerLevel.Admin
                                ? 'words.abort'
                                : 'words.reject',
                        )}
                    </Text>
                </Pressable>
            </View>
            <View style={style.walletPreviewContainer}>
                <LinearGradient
                    style={style.walletPreview}
                    colors={[
                        'rgba(255, 255, 255, 0.2)',
                        'rgba(255, 255, 255, 0)',
                    ]}>
                    <HoloCircle
                        size={40}
                        content={<SvgImage name="MultispendGroup" size={24} />}
                    />
                    <View style={style.walletInfo}>
                        <Text small bold style={style.infoText}>
                            {multispendStatus.state.invitation.federationName}
                        </Text>
                        <View style={style.balance}>
                            {/* TODO: balance */}
                            <Text style={style.infoText} bold>
                                {'100.00'}
                            </Text>
                            {/* TODO: currency */}
                            <Text small bold style={style.infoText}>
                                {'USD'}
                            </Text>
                        </View>
                    </View>
                    <View style={style.statusContainer}>
                        <View style={[style.badge, style.pendingBadge]}>
                            <Text tiny bold>
                                {t('feature.multispend.waiting-for-approval')}
                            </Text>
                        </View>
                        <View style={[style.badge]}>
                            <Text tiny bold>
                                {t('feature.multispend.x-n-votes-required', {
                                    x: Object.values(
                                        activeInvitation?.pubkeys ?? {},
                                    ).length,
                                    n: multispendStatus.state.invitation.signers
                                        .length,
                                })}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>
            <CustomOverlay
                show={isConfirmingAbort}
                onBackdropPress={() => setIsConfirmingAbort(false)}
                contents={{
                    icon: 'Info',
                    title: t(
                        isAdmin
                            ? 'feature.multispend.abort-multispend-setup'
                            : 'feature.multispend.abort-multispend-setup',
                    ),
                    description: t(
                        isAdmin
                            ? 'feature.multispend.abort-group-message'
                            : 'feature.multispend.reject-invite-message',
                    ),
                    buttons: [
                        {
                            text: t('words.cancel'),
                            onPress: () => setIsConfirmingAbort(false),
                        },
                        {
                            text: t(
                                isAdmin
                                    ? 'feature.multispend.yes-abort'
                                    : 'feature.multispend.yes-reject',
                            ),
                            primary: true,
                            disabled: isLoading,
                            onPress: isAdmin
                                ? handleAbortMultispend
                                : handleRejectMultispend,
                        },
                    ],
                }}
            />
        </HoloGradient>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            display: 'flex',
            flexDirection: 'column',
        },
        content: {
            display: 'flex',
            flexDirection: 'column',
        },
        header: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: theme.spacing.lg,
        },
        title: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
        },
        abortText: {
            color: theme.colors.red,
        },
        walletPreviewContainer: {
            padding: theme.spacing.lg,
        },
        walletPreview: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.night,
            borderRadius: 20,
            padding: 20,
        },
        walletInfo: {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xs,
            flex: 1,
            alignItems: 'flex-start',
        },
        balance: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: theme.spacing.xs,
        },
        statusContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xs,
            alignItems: 'flex-end',
        },
        badge: {
            borderRadius: 4,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xxs,
            backgroundColor: theme.colors.white,
        },
        pendingBadge: {
            color: theme.colors.orange,
            backgroundColor: theme.colors.orange100,
        },
        infoText: {
            color: theme.colors.white,
        },
    })

export default MultispendWalletHeader
