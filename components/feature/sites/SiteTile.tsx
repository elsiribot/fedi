import { Card, Icon, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import {
    Dimensions,
    Image,
    StyleSheet,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native'
import { SiteImages } from '../../../assets/images'
import { Site } from '../../../types'

type SiteTileProps = {
    site: Site
    selectSite: (site: Site) => void
    style?: ViewStyle
}

const SiteTile = ({ site, selectSite, style = {} }: SiteTileProps) => {
    const { theme } = useTheme()
    const siteImage = SiteImages[site.id]
    return (
        <Card
            containerStyle={[
                styles(theme).cardContainer,
                { backgroundColor: site.color },
                style,
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
                </View>
                <Text small style={styles(theme).description}>
                    {site.description}
                </Text>
            </TouchableOpacity>
        </Card>
    )
}

const WINDOW_WIDTH = Dimensions.get('window').width

const styles = (theme: Theme) =>
    StyleSheet.create({
        cardContainer: {
            borderRadius: theme.borders.defaultRadius,
            padding: theme.spacing.sm,
            marginBottom: theme.spacing.md,
            marginHorizontal: theme.spacing.sm,
            shadowColor: 'transparent',
            borderColor: 'transparent',
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
            width: '45%',
        },
        cardWrapper: {
            padding: theme.spacing.sm,
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
        description: {
            color: theme.colors.primaryLight,
        },
    })

export default SiteTile
