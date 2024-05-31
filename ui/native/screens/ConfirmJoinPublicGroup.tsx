import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context'

import { useMatrixChatInvites } from '@fedi/common/hooks/matrix'
import { ChatType } from '@fedi/common/types'

import HoloGradient from '../components/ui/HoloGradient'
import { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ConfirmJoinPublicGroup'
>

const ConfirmJoinPublicGroup: React.FC<Props> = ({ route, navigation }) => {
    const { groupId } = route.params

    const { t } = useTranslation()
    const { theme } = useTheme()
    const { joinPublicGroup } = useMatrixChatInvites(t)

    const [isJoiningGroup, setIsJoiningGroup] = useState(false)

    const insets = useSafeAreaInsets()

    const handleJoinGroup = useCallback(async () => {
        setIsJoiningGroup(true)
        // For now, only public rooms can be joined by scanning
        // TODO: Implement knocking to support non-public rooms
        joinPublicGroup(groupId)
            .then(() => {
                navigation.navigate('ChatRoomConversation', {
                    roomId: groupId,
                    chatType: ChatType.group,
                })
            })
            .finally(() => {
                setIsJoiningGroup(false)
            })
    }, [groupId, joinPublicGroup, navigation])

    const style = styles(theme, insets)

    return (
        <View style={style.container}>
            <View style={style.content}>
                <HoloGradient level="400" gradientStyle={style.icon}>
                    <Text style={style.iconText}>👋</Text>
                </HoloGradient>
                <Text h2 h2Style={style.buttonText}>
                    {previewGroup
                        ? t('feature.onboarding.welcome-to-federation', {
                              federation: previewGroup.info.name,
                          })
                        : t('feature.chat.join-a-group')}
                </Text>
                <Text medium style={style.messageNotice}>
                    {t('feature.chat.public-group-notice')}
                </Text>
            </View>
            <Button onPress={handleJoinGroup} loading={isJoiningGroup}>
                {t('words.continue')}
            </Button>
        </View>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        container: {
            display: 'flex',
            flexGrow: 1,
            flexDirection: 'column',
            padding: theme.spacing.xl,
            paddingBottom: Math.max(theme.spacing.xl, insets.bottom || 0),
        },
        content: {
            display: 'flex',
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 12,
        },
        buttonText: {
            textAlign: 'center',
        },
        icon: {
            width: 64,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 64,
        },
        iconText: {
            fontSize: 24,
        },
        messageNotice: {
            textAlign: 'center',
        },
    })

export default ConfirmJoinPublicGroup
