import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { Text, Theme, useTheme } from '@rneui/themed'
import { t } from 'i18next'
import React from 'react'
import { FlatList, ListRenderItem, StyleSheet, View } from 'react-native'

import SiteTile from '../components/feature/sites/SiteTile'
import { SITES } from '../constants'
import { Site } from '../types'
import type { HomeTabsParamList, RootStackParamList } from '../types/navigation'

export type Props = BottomTabScreenProps<
    HomeTabsParamList & RootStackParamList,
    'SitesList'
>

const Sites: React.FC<Props> = ({ navigation }) => {
    const { theme } = useTheme()
    const onSelect = (site: Site) => {
        navigation.navigate('SitesBrowser', { site })
    }
    const renderSite: ListRenderItem<Site> = ({ item }) => {
        return <SiteTile site={item} selectSite={onSelect} />
    }

    // TODO: Add offline state as part of #53
    return (
        <View style={styles(theme).container}>
            <Text h2 medium h2Style={styles(theme).title}>
                {t('words.sites')}
            </Text>
            <FlatList
                data={SITES}
                renderItem={renderSite}
                keyExtractor={(item: Site) => item.id}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            paddingHorizontal: theme.spacing.xl,
        },
        title: {
            marginBottom: theme.spacing.lg,
        },
    })

export default Sites
