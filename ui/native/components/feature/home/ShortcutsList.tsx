import { useNavigation } from '@react-navigation/native'
import type { Theme } from '@rneui/themed'
import { useTheme } from '@rneui/themed'
import React from 'react'
import { Linking, StyleSheet, View } from 'react-native'

import { selectFederationSites } from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import { navigate } from '../../../state/navigation'
import { Screen, Shortcut, Site } from '../../../types'
import { NavigationHook } from '../../../types/navigation'
import ShortcutTile from './ShortcutTile'

const SCREEN_SHORTCUTS = [
    new Screen({
        title: 'Settings',
        screenName: 'Settings',
        icon: {
            svg: 'Cog',
        },
    }),
]

const ShortcutsList: React.FC<{}> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const sites = useAppSelector(selectFederationSites)

    const onSelectSite = (shortcut: Shortcut) => {
        const site = shortcut as Site
        // Handle telegram links natively
        if (site.url.includes('https://t.me')) {
            Linking.openURL(site.url)
        } else {
            navigation.navigate('SitesBrowser', { site })
        }
    }

    const onSelectScreen = (shortcut: Shortcut) => {
        const screen = shortcut as Screen
        navigation.dispatch(navigate(screen.screenName))
    }

    const renderSiteShortcuts = () => {
        const sitesShortcuts = sites.map(s => new Site(s))
        return sitesShortcuts.map((s: Site, i: number) => {
            return (
                <ShortcutTile
                    key={`site-s-${i}`}
                    shortcut={s}
                    onSelect={onSelectSite}
                />
            )
        })
    }

    const renderScreenShortcuts = () => {
        return SCREEN_SHORTCUTS.map((s: Screen, i: number) => {
            return (
                <ShortcutTile
                    key={`screen-s-${i}`}
                    shortcut={s}
                    onSelect={onSelectScreen}
                />
            )
        })
    }

    // There is flexbox complexity in centering rows with 3 tiles
    // while also left-justifying rows with 1 or 2 tiles so we just
    // make sure to fill the remaining space with invisible elements
    const renderBuffers = () => {
        const totalShortcuts = sites.length + SCREEN_SHORTCUTS.length
        const bufferCount = 3 - (totalShortcuts % 3)

        return new Array(bufferCount).fill('').map((b, i) => {
            return <View key={`buffer-s-${i}`} style={styles(theme).buffer} />
        })
    }

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).listContainer}>
                {renderScreenShortcuts()}
                {renderSiteShortcuts()}
                {renderBuffers()}
            </View>
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
        buffer: {
            width: theme.percentages.shortcutTileWidth,
            height: theme.sizes.lg,
        },
        listContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
        },
    })

export default ShortcutsList
