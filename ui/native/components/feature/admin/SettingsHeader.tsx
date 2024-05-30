import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

import Header from '../../ui/Header'

const SettingsHeader: React.FC = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()

    return (
        <>
            <Header
                backButton
                containerStyle={styles(theme).container}
                headerCenter={
                    <Text bold numberOfLines={1} adjustsFontSizeToFit>
                        {t('words.account')}
                    </Text>
                }
                centerContainerStyle={{ flex: 2 }}
            />
        </>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing.lg,
        },
    })

export default SettingsHeader
