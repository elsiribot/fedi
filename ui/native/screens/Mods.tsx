import { useNavigation } from '@react-navigation/native'
import type { Theme } from '@rneui/themed'
import { useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Dimensions,
    Linking,
    Pressable,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native'

import { useGlobalFederation } from '@fedi/common/hooks/federation'
import {
    selectVisibleCustomMods,
    selectVisibleGlobalSuggestedMods,
    setCustomGlobalModVisibility,
    setSuggestedGlobalModVisibility,
} from '@fedi/common/redux/mod'

import ShortcutTile from '../components/feature/home/ShortcutTile'
import { NuxTooltip } from '../components/ui/NuxTooltip'
import SvgImage from '../components/ui/SvgImage'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import { Shortcut, FediMod } from '../types'
import { NavigationHook } from '../types/navigation'

const Mods: React.FC = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const dispatch = useAppDispatch()

    useGlobalFederation()

    const globalMods = useAppSelector(selectVisibleGlobalSuggestedMods)
    const customMods = useAppSelector(selectVisibleCustomMods)
    const { width, fontScale } = useWindowDimensions()

    const columns = width / fontScale < 300 ? 2 : 3
    const style = styles(theme, columns)

    const [actionsMod, setActionsMod] = useState<FediMod>()

    const onSelectFediMod = (shortcut: Shortcut) => {
        setActionsMod(undefined)
        const fediMod = shortcut as FediMod
        // Handle telegram and whatsapp links natively
        if (
            fediMod.url.includes('https://t.me') ||
            fediMod.url.includes('https://wa.me')
        ) {
            Linking.openURL(fediMod.url)
        } else {
            navigation.navigate('FediModBrowser', { fediMod })
        }
    }

    const handleModHold = (shortcut: Shortcut) => {
        const fediMod = shortcut as FediMod
        setActionsMod(fediMod)
    }

    const toggleHideMod = (modId: FediMod['id']) => {
        const isGlobal = globalMods.some(mod => mod.id === modId)

        if (isGlobal) {
            dispatch(
                setSuggestedGlobalModVisibility({
                    modId,
                    isHidden: true,
                }),
            )
        } else {
            dispatch(setCustomGlobalModVisibility({ modId, isHidden: true }))
        }

        setActionsMod(undefined)
    }

    const renderFediModShortcuts = () => {
        const fediModShortcuts = [...globalMods, ...customMods].map(
            s => new FediMod(s),
        )
        return fediModShortcuts.map((s: FediMod) => {
            return (
                <View key={`fediMod-s-${s.id}`} style={style.shortcut}>
                    {/* an invisible overlay so we can hide the tooltip on outside press */}
                    <Pressable
                        style={style.tooltipOverlay}
                        onPress={() => setActionsMod(undefined)}
                    />
                    <NuxTooltip
                        shouldShow={actionsMod?.id === s.id}
                        orientation="above"
                        verticalOffset={96}
                        horizontalOffset={48}
                        text="">
                        <Pressable
                            style={style.tooltipAction}
                            onPress={() => toggleHideMod(s.id)}>
                            <Text style={style.tooltipText}>
                                {t('words.hide')}
                            </Text>
                            <SvgImage name="Eye" />
                        </Pressable>
                    </NuxTooltip>
                    <ShortcutTile
                        shortcut={s}
                        onSelect={onSelectFediMod}
                        onHold={handleModHold}
                    />
                </View>
            )
        })
    }

    // There is flexbox complexity in centering rows with 3 tiles
    // while also left-justifying rows with 1 or 2 tiles so we just
    // make sure to fill the remaining space with invisible elements
    const renderBuffers = () => {
        const totalShortcuts = customMods.length
        const bufferCount = columns - (totalShortcuts % columns)

        return new Array(bufferCount).fill('').map((b, i) => {
            return (
                <View
                    key={`buffer-s-${i}`}
                    style={[style.shortcut, style.buffer]}
                />
            )
        })
    }

    return (
        <View style={style.container}>
            <View style={style.listContainer}>
                {renderFediModShortcuts()}
                {renderBuffers()}
            </View>
        </View>
    )
}

const styles = (theme: Theme, columns: number) =>
    StyleSheet.create({
        container: {
            flex: 1,
            width: '100%',
            marginVertical: theme.spacing.xl,
        },
        shortcut: {
            width: `${100 / columns}%`,
        },
        buffer: {
            height: theme.sizes.lg,
        },
        listContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
        },
        tooltipAction: {
            flexDirection: 'row',
            gap: theme.sizes.xs,
        },
        tooltipText: {
            color: theme.colors.primary,
        },
        tooltipOverlay: {
            height: Dimensions.get('window').height,
            width: Dimensions.get('window').width,
            position: 'absolute',
        },
    })

export default Mods
