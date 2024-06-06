import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

import { useNuxStep } from '@fedi/common/hooks/nux'
import {
    selectIsMatrixChatEmpty,
    selectShouldShowUpgradeChat,
} from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import { PressableIcon } from '../../ui/PressableIcon'
import { Tooltip } from '../../ui/Tooltip'
import { ChatConnectionBadge } from './ChatConnectionBadge'
import HeaderAvatar from './HeaderAvatar'

const ChatHeader: React.FC = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const shouldShowUpgradeChat = useAppSelector(selectShouldShowUpgradeChat)
    const isChatEmpty = useAppSelector(selectIsMatrixChatEmpty)
    const [hasViewedMemberQr, completeViewedMemberQr] =
        useNuxStep('hasViewedMemberQr')

    if (shouldShowUpgradeChat) return null

    const style = styles(theme)

    return (
        <>
            <Header
                containerStyle={style.container}
                headerLeft={
                    <Text h2 medium numberOfLines={1}>
                        {t('words.chat')}
                    </Text>
                }
                headerRight={
                    <HeaderAvatar
                        onPress={() => {
                            navigation.navigate('Settings')
                            completeViewedMemberQr()
                        }}
                    />
                }
                leftContainerStyle={{ borderWidth: 1 }}
            />
            <ChatConnectionBadge />
        </>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            paddingBottom: theme.spacing.md,
        },
    })

export default ChatHeader
