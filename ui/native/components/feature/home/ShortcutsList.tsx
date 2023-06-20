import { useNavigation } from '@react-navigation/native'
import type { Theme } from '@rneui/themed'
import { useTheme } from '@rneui/themed'
import React from 'react'
import { Linking, StyleSheet, View } from 'react-native'

import { selectFederationFediMods } from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import { navigate } from '../../../state/navigation'
import { Screen, Shortcut, FediMod } from '../../../types'
import { NavigationHook } from '../../../types/navigation'
import ShortcutTile from './ShortcutTile'

const SCREEN_SHORTCUTS: Screen[] = []

const ShortcutsList: React.FC<{}> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const fediMods = useAppSelector(selectFederationFediMods)

    const onSelectFediMod = (shortcut: Shortcut) => {
        const fediMod = shortcut as FediMod
        // Handle telegram links natively
        if (fediMod.url.includes('https://t.me')) {
            Linking.openURL(fediMod.url)
        } else {
            navigation.navigate('SitesBrowser', { site: fediMod })
        }
    }

    const onSelectScreen = (shortcut: Shortcut) => {
        const screen = shortcut as Screen
        navigation.dispatch(navigate(screen.screenName))
    }

    const renderFediModShortcuts = () => {
        const fediModShortcuts = fediMods.map(s => new FediMod(s))
        return fediModShortcuts.map((s: FediMod, i: number) => {
            return (
                <ShortcutTile
                    key={`site-s-${i}`}
                    shortcut={s}
                    onSelect={onSelectFediMod}
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
        const totalShortcuts = fediMods.length + SCREEN_SHORTCUTS.length
        const bufferCount = 3 - (totalShortcuts % 3)

        return new Array(bufferCount).fill('').map((b, i) => {
            return <View key={`buffer-s-${i}`} style={styles(theme).buffer} />
        })
    }

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).listContainer}>
                {renderScreenShortcuts()}
                {renderFediModShortcuts()}
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
