import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'

import { useNuxStep } from '@fedi/common/hooks/nux'
import {
    selectIsMatrixChatEmpty,
    selectShouldShowUpgradeChat,
} from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import { NuxTooltip } from '../../ui/NuxTooltip'
import SvgImage from '../../ui/SvgImage'
import { ChatConnectionBadge } from './ChatConnectionBadge'

const ChatHeader: React.FC = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const shouldShowUpgradeChat = useAppSelector(selectShouldShowUpgradeChat)
    const isChatEmpty = useAppSelector(selectIsMatrixChatEmpty)
    const [hasViewedMemberQr, completeViewedMemberQr] =
        useNuxStep('hasViewedMemberQr')

    if (shouldShowUpgradeChat) return null

    return (
        <>
            <Header
                inline
                containerStyle={styles(theme).container}
                leftContainerStyle={{ flex: 2 }}
                headerLeft={
                    <Text h2 medium>
                        {t('words.chat')}
                    </Text>
                }
                centerContainerStyle={{ flex: 2 }}
                headerRight={
                    <>
                        <Pressable
                            onPress={() => {
                                navigation.navigate('MemberQrCode')
                                completeViewedMemberQr()
                            }}
                            hitSlop={5}>
                            <SvgImage name="Qr" color={theme.colors.primary} />
                        </Pressable>

                        <NuxTooltip
                            delay={600}
                            shouldShow={isChatEmpty && !hasViewedMemberQr}
                            orientation="below"
                            side="right"
                            text="Your username"
                            horizontalOffset={12}
                            verticalOffset={32}
                        />
                    </>
                }
                rightContainerStyle={styles(theme).rightContainer}
            />
            <ChatConnectionBadge offset={14} noSafeArea />
        </>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            paddingBottom: theme.spacing.lg,
        },
        rightContainer: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
        },
    })

export default ChatHeader
