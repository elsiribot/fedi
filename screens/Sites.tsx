import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import React from 'react'
import {
    Dimensions,
    FlatList,
    ListRenderItem,
    StyleSheet,
    View,
} from 'react-native'

import type { HomeTabsParamList, RootStackParamList } from '../types/navigation'
import SiteTile from '../components/feature/sites/SiteTile'
import { Site } from '../types'
import { SITES } from '../constants'
import { Theme, useTheme } from '@rneui/themed'

export type Props = BottomTabScreenProps<
    HomeTabsParamList & RootStackParamList,
    'Sites'
>

const WINDOW_WIDTH = Dimensions.get('window').width

const Sites: React.FC<Props> = ({ navigation }) => {
    const { theme } = useTheme()
    const onSelect = (site: Site) => {
        navigation.navigate('Webview', { site })
    }
    const renderSite: ListRenderItem<Site> = ({ item }) => {
        return <SiteTile site={item} selectSite={onSelect} />
    }
    return (
        <View style={styles(theme).container}>
            <FlatList
                data={SITES}
                renderItem={renderSite}
                keyExtractor={(item: Site) => `${item.url}`}
                // optimization that allows skipping the measurement of dynamic content
                // for fixed-size list items
                getItemLayout={(data, index) => ({
                    length: WINDOW_WIDTH,
                    offset: 48 * index,
                    index,
                })}
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
    })

export default Sites
