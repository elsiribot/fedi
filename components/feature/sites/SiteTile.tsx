import { Card, Icon, Text, Theme, useTheme } from '@rneui/themed'
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
        <Card
            containerStyle={[
                styles(theme).cardContainer,
                { backgroundColor: site.color },
            ]}
            wrapperStyle={styles(theme).cardWrapper}>
            <TouchableOpacity onPress={() => selectSite(site)}>
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
                            size={32}
                        />
                    )}
                </View>
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
            </TouchableOpacity>
        </Card>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        cardContainer: {
            borderRadius: theme.borders.defaultRadius,
            padding: theme.spacing.sm,
            width: '80%',
            marginBottom: theme.spacing.md,
            shadowColor: 'transparent',
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
        },
        cardWrapper: {
            padding: theme.spacing.md,
            flex: 1,
        },
        icon: {
            width: 32,
            height: 32,
            overflow: 'hidden',
            borderRadius: 4,
            marginBottom: theme.spacing.sm,
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
