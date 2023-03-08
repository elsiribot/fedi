import { Icon, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Image, Pressable, StyleSheet, View } from 'react-native'
import { SiteImages } from '../../../assets/images'
import { Site } from '../../../types'

type SiteTileProps = {
    site: Site
    selectSite: (site: Site) => void
}

const SiteTile = ({ site, selectSite }: SiteTileProps) => {
    const { theme } = useTheme()
    const siteImage = SiteImages[site.id]
    return (
        <Pressable
            style={styles(theme).container}
            onPress={() => selectSite(site)}>
            <View>
                {siteImage ? (
                    <Image
                        style={styles(theme).icon}
                        source={siteImage}
                        resizeMode="contain"
                    />
                ) : (
                    <Icon
                        style={styles(theme).icon}
                        name="web-box"
                        type="material-community"
                        color={theme.colors.orange}
                        size={theme.sizes.lg}
                    />
                )}
            </View>
            <View style={styles(theme).siteTitle}>
                <Text caption medium style={styles(theme).siteTitleText}>
                    {site.title}
                </Text>
            </View>
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
            width: '33%',
            marginVertical: theme.spacing.md,
        },
        icon: {
            width: theme.sizes.lg,
            height: theme.sizes.lg,
            overflow: 'hidden',
            borderRadius: theme.borders.siteTileRadius,
            marginBottom: theme.spacing.xs,
        },
        siteTitle: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingBottom: theme.spacing.xs,
        },
        siteTitleText: {
            textAlign: 'center',
            paddingRight: theme.spacing.xs,
        },
    })

export default SiteTile
