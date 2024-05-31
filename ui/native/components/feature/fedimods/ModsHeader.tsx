import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import { PressableIcon } from '../../ui/PressableIcon'

const ModsHeader: React.FC = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()

    const style = styles(theme)

    const handleAddPress = () => {
        navigation.push('AddFediMod')
    }

    return (
        <>
            <Header
                containerStyle={style.container}
                headerLeft={
                    <Text h2 medium>
                        {t('words.mods')}
                    </Text>
                }
                headerRight={
                    <PressableIcon
                        onPress={handleAddPress}
                        hitSlop={5}
                        svgName="Plus"
                    />
                }
                rightContainerStyle={style.rightContainer}
                centerContainerStyle={{ flex: 2 }}
            />
        </>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            paddingBottom: theme.spacing.lg,
        },
        rightContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
        },
    })

export default ModsHeader
