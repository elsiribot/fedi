import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native'

import { selectIsActiveFederationRecovering } from '@fedi/common/redux'

import { FediModImages } from '../../../assets/images'
import { useAppSelector } from '../../../state/hooks'
import { FediMod, Shortcut, ShortcutType } from '../../../types'
import { Pressable } from '../../ui/Pressable'
import SvgImage, {
    SvgImageName,
    SvgImageSize,
    getIconSizeMultiplier,
} from '../../ui/SvgImage'

type ShortcutTileProps = {
    shortcut: Shortcut
    onHold?: (shortcut: Shortcut) => void
    onSelect: (shortcut: Shortcut) => void
}

function isMod(shortcut: Shortcut | FediMod): shortcut is FediMod {
    return shortcut.type === ShortcutType.fediMod
}

const ShortcutTile = ({ shortcut, onHold, onSelect }: ShortcutTileProps) => {
    const { theme } = useTheme()
    const { fontScale } = useWindowDimensions()

    const recoveryInProgress = useAppSelector(
        selectIsActiveFederationRecovering,
    )

    const style = styles(theme, fontScale)

    const renderIcon = () => {
        if (isMod(shortcut)) {
            // use local image if we have it
            let imageSrc = FediModImages[shortcut.id]

            if (!imageSrc) {
                if (shortcut.imageUrl) {
                    imageSrc = { uri: shortcut.imageUrl }
                } else {
                    imageSrc = FediModImages.default
                }
            }

            return (
                <Image
                    style={style.iconImage}
                    source={imageSrc}
                    resizeMode="contain"
                />
            )
        } else if (shortcut.icon.image) {
            return (
                <Image
                    style={style.iconImage}
                    source={shortcut.icon.image}
                    resizeMode="contain"
                />
            )
        } else if (shortcut.icon.svg) {
            return (
                <SvgImage
                    containerStyle={style.iconSvg}
                    name={shortcut.icon.svg as SvgImageName}
                    size={SvgImageSize.md}
                    color={theme.colors.secondary}
                />
            )
        }
    }

    return (
        <Pressable
            containerStyle={[
                style.container,
                recoveryInProgress ? style.disabled : null,
            ]}
            onPress={() => onSelect(shortcut)}
            onLongPress={() => onHold?.(shortcut)}
            disabled={recoveryInProgress}>
            <View>{renderIcon()}</View>
            <View style={style.title}>
                <Text caption medium numberOfLines={2} style={style.titleText}>
                    {shortcut.title}
                </Text>
            </View>
        </Pressable>
    )
}

const styles = (theme: Theme, fontScale: number) => {
    const iconSize = theme.sizes.lg * getIconSizeMultiplier(fontScale)
    return StyleSheet.create({
        container: {
            alignItems: 'center',
            width: '100%',
            paddingHorizontal: theme.spacing.sm,
            flexDirection: 'column',
        },
        disabled: {
            opacity: 0.5,
        },
        iconImage: {
            width: iconSize,
            height: iconSize,
            overflow: 'hidden',
            borderRadius: theme.borders.fediModTileRadius,
            marginBottom: theme.spacing.xs,
        },
        iconSvg: {
            width: iconSize,
            height: iconSize,
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
            paddingHorizontal: theme.spacing.xs,
        },
        titleText: {
            textAlign: 'center',
            lineHeight: 20,
        },
    })
}

export default ShortcutTile
