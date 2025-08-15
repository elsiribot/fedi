import { Text, Theme, useTheme } from '@rneui/themed'
import { useEffect, useState } from 'react'
import {
    Image,
    ImageSourcePropType,
    StyleSheet,
    View,
    useWindowDimensions,
} from 'react-native'
import TurboImage from 'react-native-turbo-image'

import { selectIsActiveFederationRecovering } from '@fedi/common/redux'
import { tryFetchUrlMetadata } from '@fedi/common/utils/fedimods'
import { makeLog } from '@fedi/common/utils/log'
import { constructUrl } from '@fedi/common/utils/neverthrow'

import { FediModImages } from '../../../assets/images'
import {
    FEDIMOD_IMAGE_CACHE_PREFIX,
    FEDIMOD_SVG_CACHE_PREFIX,
} from '../../../constants'
import { useAppSelector } from '../../../state/hooks'
import { FediMod, Shortcut, ShortcutType } from '../../../types'
import {
    getMetadataCacheKey,
    cacheMetadataWithTimestamp,
    getCachedMetadata,
} from '../../../utils/cache'
import { BubbleView } from '../../ui/BubbleView'
import Flex from '../../ui/Flex'
import { Pressable } from '../../ui/Pressable'
import SvgImage, {
    SvgImageName,
    SvgImageSize,
    getIconSizeMultiplier,
} from '../../ui/SvgImage'

type ShortcutTileProps = {
    shortcut: FediMod
    onHold?: (fediMod: FediMod) => void
    onSelect: (fediMod: FediMod) => void
}

const log = makeLog('ShortcutTile')

function isMod(shortcut: Shortcut | FediMod): shortcut is FediMod {
    return shortcut.type === ShortcutType.fediMod
}

const ShortcutTile = ({ shortcut, onHold, onSelect }: ShortcutTileProps) => {
    const { theme } = useTheme()
    const { fontScale } = useWindowDimensions()
    const [imageSrc, setImageSrc] = useState<ImageSourcePropType>(
        FediModImages.default,
    )

    useEffect(() => {
        if (isMod(shortcut)) {
            if (FediModImages[shortcut.id]) {
                setImageSrc(FediModImages[shortcut.id])
            } else if (shortcut.imageUrl) {
                setImageSrc({ uri: shortcut.imageUrl })
            } else {
                const loadMetadata = async () => {
                    const cacheKey = getMetadataCacheKey(
                        shortcut.id,
                        shortcut.url,
                    )

                    const cachedIconUri = getCachedMetadata(cacheKey)
                    if (cachedIconUri) {
                        setImageSrc({ uri: cachedIconUri })
                        return
                    }

                    constructUrl(shortcut.url)
                        .asyncAndThen(tryFetchUrlMetadata)
                        .match(
                            ({ icon }) => {
                                cacheMetadataWithTimestamp(cacheKey, icon)
                                setImageSrc({ uri: icon })
                            },
                            e => {
                                log.error(
                                    'Failed to fetch fedi mod metadata',
                                    e,
                                )
                            },
                        )
                }

                loadMetadata()
            }
        }
    }, [shortcut])

    const recoveryInProgress = useAppSelector(
        selectIsActiveFederationRecovering,
    )

    const multiplier = Math.min(fontScale, 2)

    const style = styles(theme, multiplier)

    const renderIcon = () => {
        if (isMod(shortcut) && imageSrc) {
            const isSvg =
                // imageSrc can be an array of ImageUriSource
                // see https://reactnative.dev/docs/image#source
                !Array.isArray(imageSrc) &&
                // ImageRequireSource can be a number, so rule that out too
                typeof imageSrc !== 'number' &&
                imageSrc.uri?.endsWith('svg')

            if (isSvg && imageSrc.uri) {
                const cacheKey = `${FEDIMOD_SVG_CACHE_PREFIX}${shortcut.id}_${imageSrc.uri}`

                return (
                    <TurboImage
                        source={{
                            uri: imageSrc.uri,
                            cacheKey: cacheKey,
                        }}
                        style={style.iconImage}
                        cachePolicy="dataCache"
                        resizeMode="contain"
                        format="svg"
                        fadeDuration={200}
                        onFailure={error => {
                            log.warn(
                                `Failed to load SVG for ${shortcut.title}:`,
                                error,
                            )
                            setImageSrc(FediModImages.default)
                        }}
                        allowHardware={true}
                        showPlaceholderOnFailure={false}
                    />
                )
            }

            const isRemoteImage =
                !Array.isArray(imageSrc) &&
                typeof imageSrc !== 'number' &&
                imageSrc.uri

            if (isRemoteImage && imageSrc.uri) {
                const cacheKey = `${FEDIMOD_IMAGE_CACHE_PREFIX}${shortcut.id}_${imageSrc.uri}`

                return (
                    <TurboImage
                        source={{
                            uri: imageSrc.uri,
                            cacheKey: cacheKey,
                        }}
                        style={style.iconImage}
                        cachePolicy="dataCache"
                        resizeMode="contain"
                        fadeDuration={200}
                        onFailure={error => {
                            log.warn(
                                `Failed to load image for ${shortcut.title}:`,
                                error,
                            )
                            setImageSrc(FediModImages.default)
                        }}
                        allowHardware={true}
                        showPlaceholderOnFailure={false}
                    />
                )
            }

            return (
                <Image
                    style={style.iconImage}
                    source={imageSrc}
                    resizeMode="contain"
                    onError={() => {
                        setImageSrc(FediModImages.default)
                    }}
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
                    maxFontSizeMultiplier={1.2}
                />
            )
        }

        return null
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
            <View style={style.iconContainer}>
                <BubbleView containerStyle={style.bubbleContainer}>
                    {renderIcon()}
                </BubbleView>
            </View>
            <Flex row align="center" justify="start" style={style.title}>
                <Text
                    caption
                    medium
                    style={style.titleText}
                    adjustsFontSizeToFit>
                    {shortcut.title}
                </Text>
            </Flex>
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
            paddingVertical: theme.spacing.xs,
        },
        disabled: {
            opacity: 0.5,
        },
        iconContainer: {
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 1,
            },
            shadowOpacity: 0.3,
            shadowRadius: 1.0,

            elevation: 1,
        },
        bubbleContainer: {
            width: iconSize,
            height: iconSize,
            overflow: 'hidden',
            borderRadius: theme.borders.fediModTileRadius,
            backgroundColor: theme.colors.white,
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
