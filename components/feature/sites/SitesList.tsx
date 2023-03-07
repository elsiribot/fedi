import { useNavigation } from '@react-navigation/native'
import type { Theme } from '@rneui/themed'
import { Text, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { SITES } from '../../../constants'
import { Site } from '../../../types'
import { NavigationHook } from '../../../types/navigation'
import SiteTile from './SiteTile'

const SitesList: React.FC<{}> = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()

    const onSelect = (site: Site) => {
        navigation.navigate('SitesBrowser', { site })
    }

    const renderSites = () => {
        return SITES.map((s, i) => {
            return <SiteTile key={`s-${i}`} site={s} selectSite={onSelect} />
        })
    }

    return (
        <View style={styles(theme).container}>
            <Text medium style={styles(theme).title}>
                {t('words.sites')}
            </Text>
            <View style={styles(theme).listContainer}>{renderSites()}</View>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            width: '88%',
            marginVertical: theme.spacing.xl,
        },
        title: {
            color: theme.colors.primaryLight,
            marginBottom: theme.spacing.lg,
        },
        listContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
        },
    })

export default SitesList
