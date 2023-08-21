import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'

import { selectWebsocketIsHealthy } from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'

const SettingsHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const websocketIsHealthy = useAppSelector(selectWebsocketIsHealthy)

    return (
        <Header
            inline
            leftContainerStyle={{ flex: 2 }}
            headerLeft={
                <Text h2 medium>
                    {t('words.settings')}
                </Text>
            }
            centerContainerStyle={{ flex: 2 }}
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
            rightContainerStyle={styles(theme).rightContainer}
        />
    )
}

const styles = (_theme: Theme) =>
    StyleSheet.create({
        rightContainer: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'flex-end',
        },
    })

export default SettingsHeader
