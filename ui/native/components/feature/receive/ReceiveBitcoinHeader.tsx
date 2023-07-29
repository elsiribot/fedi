import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'

import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'

const ReceiveBitcoinHeader: React.FC<{}> = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()

    return (
        <Header
            backButton
            headerCenter={
                <Text bold>{t('feature.receive.request-bitcoin')}</Text>
            }
            headerRight={
                <Pressable
                    onPress={() => navigation.navigate('ReceiveOffline')}
                    hitSlop={5}>
                    <SvgImage name="Scan" color={theme.colors.primary} />
                </Pressable>
            }
            rightContainerStyle={styles(theme).rightContainer}
        />
    )
}
const styles = (_theme: Theme) =>
    StyleSheet.create({
        rightContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
        },
    })

export default ReceiveBitcoinHeader
