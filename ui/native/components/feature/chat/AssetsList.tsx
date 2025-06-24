import { Image, Theme, useTheme } from '@rneui/themed'
import React, { useMemo } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { Asset } from 'react-native-image-picker'

import { upsertListItem } from '@fedi/common/utils/redux'

import Flex from '../../ui/Flex'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

interface Props {
    assets: Asset[]
    loadingAssets: Asset[]
    setAttachments: (assets: Asset[]) => void
}

export const AssetsList: React.FC<Props> = ({
    assets,
    loadingAssets,
    setAttachments,
}) => {
    const { theme } = useTheme()
    const style = styles(theme)

    const attachmentListItems = useMemo(() => {
        const makeAssetId = (d: Asset) => `${d.fileName}-${d.fileSize}-${d.uri}`

        let items: Array<{
            id: string
            isLoading: boolean
            asset: Asset
        }> = assets.map(asset => ({
            asset,
            isLoading: false,
            id: makeAssetId(asset),
        }))

        for (const asset of loadingAssets) {
            items = upsertListItem(items, {
                asset,
                isLoading: true,
                id: makeAssetId(asset),
            })
        }
        return (
            items
                // To prevent layout shifts and unwanted reordering
                // First sort by file name then place images before video attachments
                .sort((a, b) =>
                    (a.asset.fileName ?? '').localeCompare(
                        b.asset.fileName ?? '',
                    ),
                )
                .sort((a, b) => {
                    const aMime = a.asset.type ?? ''
                    const bMime = b.asset.type ?? ''

                    if (aMime === bMime) return 0
                    if (aMime.startsWith('image')) return -1
                    return 1
                })
        )
    }, [assets, loadingAssets])

    return (
        <Flex row gap="lg" wrap>
            {attachmentListItems.map(({ asset, isLoading }) =>
                isLoading ? (
                    <View key={asset.uri} style={style.asset}>
                        <Flex center style={style.preview}>
                            <ActivityIndicator />
                        </Flex>
                    </View>
                ) : (
                    <View key={asset.uri} style={style.asset}>
                        {asset.type?.startsWith('image') ? (
                            <Image
                                source={{
                                    uri: asset.uri,
                                    width: asset.width,
                                    height: asset.height,
                                }}
                                style={style.image}
                                resizeMode="cover"
                            />
                        ) : asset.type?.startsWith('video') ? (
                            <Flex center style={style.preview}>
                                <SvgImage name="Video" />
                            </Flex>
                        ) : (
                            <Flex center style={style.preview}>
                                <SvgImage name="File" />
                            </Flex>
                        )}
                        <Pressable
                            style={style.removeButton}
                            onPress={() =>
                                setAttachments(assets.filter(a => a !== asset))
                            }>
                            <SvgImage
                                name="Close"
                                size={SvgImageSize.xs}
                                color={theme.colors.white}
                            />
                        </Pressable>
                    </View>
                ),
            )}
        </Flex>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        asset: {
            position: 'relative',
            width: 48,
            height: 48,
        },
        image: {
            width: '100%',
            height: '100%',
            borderRadius: 8,
        },
        removeButton: {
            justifyContent: 'center',
            alignItems: 'center',
            position: 'absolute',
            top: -6,
            right: -6,
            width: 16,
            height: 16,
            borderRadius: 16,
            backgroundColor: theme.colors.night,
        },
        uploadButton: {
            padding: theme.spacing.md,
            backgroundColor: theme.colors.offWhite,
        },
        uploadButtonTitle: {
            marginLeft: theme.spacing.sm,
            color: theme.colors.primary,
        },
        preview: {
            backgroundColor: theme.colors.extraLightGrey,
            width: '100%',
            height: '100%',
            borderRadius: 8,
        },
    })
