import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import { t } from 'i18next'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import SiteTile from '../components/feature/sites/SiteTile'
import { SITES } from '../constants'
import { Site } from '../types'
import type { SitesStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<SitesStackParamList, 'SitesList'>

const SitesList: React.FC<Props> = ({ navigation }) => {
    const { theme } = useTheme()
    const onSelect = (site: Site) => {
        navigation.navigate('SitesBrowser', { site })
    }
    // const renderSite: ListRenderItem<Site> = ({ item }) => {
    //     return <SiteTile site={item} selectSite={onSelect} />
    // }
    const renderSites = () => {
        return SITES.filter((s, i) => i !== 0).map((s, i) => {
            return <SiteTile key={`s-${i}`} site={s} selectSite={onSelect} />
        })
    }

    // TODO: Add offline state as part of #53
    return (
        <ScrollView contentContainerStyle={styles(theme).container}>
            <View style={styles(theme).headerContainer}>
                <Text h2 medium h2Style={styles(theme).title}>
                    {t('words.sites')}
                </Text>
                <Text caption>
                    {t('feature.sites.bitcoin-sites-fedi-wallet')}
                </Text>
            </View>
            <SiteTile
                site={SITES[0]}
                selectSite={onSelect}
                style={{ width: '94%' }}
            />

            <View style={styles(theme).listContainer}>{renderSites()}</View>

            {/* <FlatList
                data={SITES.filter((s, i) => i !== 0)}
                renderItem={renderSite}
                keyExtractor={(item: Site) => item.id}
                contentContainerStyle={styles(theme).listContainer}
            /> */}
        </ScrollView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.lg,
        },
        headerContainer: {
            paddingHorizontal: theme.spacing.sm,
            marginBottom: theme.spacing.md,
        },
        title: {
            marginBottom: theme.spacing.md,
        },
        listContainer: {
            // paddingHorizontal: 0,
            // backgroundColor: 'lightblue',
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
    })

export default SitesList
