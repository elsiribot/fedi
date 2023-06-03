import { useNavigation } from '@react-navigation/native'
import { Text, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable } from 'react-native'

import { useChatContext } from '../../../state/contexts/ChatContext'
import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'

const SettingsHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const { state } = useChatContext()
    const { websocketIsHealthy } = state

    return (
        <Header
            leftContainerStyle={{ flex: 6 }}
            headerLeft={
                <Text h2 medium>
                    {t('words.settings')}
                </Text>
            }
            headerRight={
                <>
                    {websocketIsHealthy && (
                        <Pressable
                            onPress={() => navigation.navigate('MemberQrCode')}
                            hitSlop={5}>
                            <SvgImage name="Qr" color={theme.colors.primary} />
                        </Pressable>
                    )}
                </>
            }
        />
    )
}

export default SettingsHeader
