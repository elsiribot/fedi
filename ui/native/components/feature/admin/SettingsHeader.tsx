import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'

import { selectMatrixAuth } from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'
import SelectedFederationHeader from '../federations/SelectedFederationHeader'

const SettingsHeader: React.FC = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const matrixAuth = useAppSelector(selectMatrixAuth)

    return (
        <>
            <SelectedFederationHeader />
            <Header
                inline
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
