import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'

import { selectWebsocketIsHealthy } from '@fedi/common/redux'

import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useAppSelector } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'

const ChatHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const { toast } = useEnvironmentContext().state
    const websocketIsHealthy = useAppSelector(selectWebsocketIsHealthy)

    return (
        <Header
            inline
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
                        disabled={websocketIsHealthy}
                        onPress={() => {
                            toast?.show(
                                t('errors.chat-connection-unhealthy'),
                                3000,
                            )
                        }}
                        hitSlop={5}>
                        <SvgImage
                            name="Recovery"
                            color={theme.colors.primaryLight}
                            containerStyle={{
                                opacity: websocketIsHealthy ? 0 : 0.2,
                            }}
                        />
                    </Pressable>
                    {websocketIsHealthy && (
                        <Pressable
                            onPress={() => navigation.navigate('MemberQrCode')}
                            hitSlop={5}>
                            <SvgImage name="Qr" color={theme.colors.primary} />
                        </Pressable>
                    )}
                </>
            }
            rightContainerStyle={styles(theme).rightContainer}
        />
    )
}

const styles = (_theme: Theme) =>
    StyleSheet.create({
        rightContainer: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
    })

export default ChatHeader
