import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Image, Pressable, StyleSheet, View } from 'react-native'

import { Shortcut } from '../../../types'
import SvgImage, { SvgImageName, SvgImageSize } from '../../ui/SvgImage'

type ShortcutTileProps = {
    shortcut: Shortcut
    onSelect: (shortcut: Shortcut) => void
}

const ShortcutTile = ({ shortcut, onSelect }: ShortcutTileProps) => {
    const { theme } = useTheme()

    const renderIcon = () => {
        if (shortcut.icon.image) {
            return (
                <Image
                    style={styles(theme).iconImage}
                    source={shortcut.icon.image}
                    resizeMode="contain"
                />
            )
        } else if (shortcut.icon.svg) {
            return (
                <SvgImage
                    containerStyle={styles(theme).iconSvg}
                    name={shortcut.icon.svg as SvgImageName}
                    size={SvgImageSize.md}
                    color={theme.colors.secondary}
                />
            )
        }
    }

    return (
        <Pressable
            style={styles(theme).container}
            onPress={() => onSelect(shortcut)}>
            <View>{renderIcon()}</View>
            <View style={styles(theme).title}>
                <Text caption medium style={styles(theme).titleText}>
                    {shortcut.title}
                </Text>
            </View>
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
            width: theme.percentages.shortcutTileWidth,
            marginVertical: theme.spacing.md,
        },
        iconImage: {
            width: theme.sizes.lg,
            height: theme.sizes.lg,
            overflow: 'hidden',
            borderRadius: theme.borders.fediModTileRadius,
            marginBottom: theme.spacing.xs,
        },
        iconSvg: {
            width: theme.sizes.lg,
            height: theme.sizes.lg,
            borderRadius: theme.borders.fediModTileRadius,
            backgroundColor: theme.colors.primary,
            marginBottom: theme.spacing.xs,
            alignItems: 'center',
            justifyContent: 'center',
        },
        title: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingBottom: theme.spacing.xs,
        },
        titleText: {
            textAlign: 'center',
            paddingRight: theme.spacing.xs,
        },
    })

export default ShortcutTile
