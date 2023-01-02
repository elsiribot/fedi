import { Icon, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native'
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
        <TouchableOpacity
            onPress={() => selectSite(site)}
            style={styles(theme).container}>
            <View style={styles(theme).leftContainer}>
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
                        size={32}
                    />
                )}
            </View>
            <View style={styles(theme).centerContainer}>
                <View style={styles(theme).siteTitle}>
                    <Text caption medium style={styles(theme).siteTitleText}>
                        {site.title}
                    </Text>
                    <Icon
                        name="shield-check"
                        type="material-community"
                        color={theme.colors.primary}
                        size={14}
                    />
                </View>
                <Text small style={styles(theme).description}>
                    {site.description}
                </Text>
            </View>
        </TouchableOpacity>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            backgroundColor: theme.colors.secondary,
            width: '100%',
            marginBottom: theme.spacing.xl,
        },
        leftContainer: {
            width: 32,
            flexShrink: 0,
        },
        icon: {
            width: 32,
            height: 32,
            overflow: 'hidden',
            borderRadius: 4,
        },
        centerContainer: {
            flex: 1,
            alignItems: 'flex-start',
            paddingHorizontal: theme.spacing.md,
            flexDirection: 'column',
        },
        siteTitle: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingBottom: theme.spacing.xs,
        },
        siteTitleText: {
            paddingRight: theme.spacing.xs,
        },
        rightContainer: {
            width: '30%',
            flexDirection: 'column',
            justifyContent: 'flex-end',
        },
        rightAlignedText: {
            textAlign: 'right',
        },
        subText: {
            fontSize: theme.sizes.xs,
            opa: theme.colors.primaryLight,
        },
        description: {
            color: theme.colors.primaryLight,
        },
    })

export default SiteTile
