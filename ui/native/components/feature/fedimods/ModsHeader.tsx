import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import MainHeaderButtons from '../../ui/MainHeaderButtons'

const ModsHeader: React.FC = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()

    const style = styles(theme)

    const handleAddPress = () => {
        navigation.navigate('AddFediMod')
    }

    return (
        <>
            <Header
                containerStyle={style.container}
                headerLeft={
                    <Text h2 medium numberOfLines={1} adjustsFontSizeToFit>
                        {t('phrases.mini-apps')}
                    </Text>
                }
                headerRight={<MainHeaderButtons onAddPress={handleAddPress} />}
            />
        </>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            paddingHorizontal: theme.spacing.lg,
        },
    })

export default ModsHeader
