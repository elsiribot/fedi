import { Icon, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { Site } from '../../../types'

type SiteTileProps = {
    site: Site
    selectSite: (site: Site) => void
}

const SiteTile = ({ site, selectSite }: SiteTileProps) => {
    const { theme } = useTheme()
    return (
        <TouchableOpacity
            onPress={() => selectSite(site)}
            style={styles(theme).container}>
            {/* TODO: show the right icon */}
            <View style={styles(theme).leftContainer}>
                <Icon
                    style={styles(theme).icon}
                    name="bitcoin"
                    type="material-community"
                    color={theme.colors.orange}
                    size={theme.sizes.md}
                />
            </View>
            <View style={styles(theme).centerContainer}>
                <View style={styles(theme).siteTitle}>
                    <Text>{site.title}</Text>
                    <Icon
                        name="check"
                        type="font-awesome"
                        color={theme.colors.orange}
                        size={theme.sizes.sm}
                    />
                </View>
                <Text>{site.description}</Text>
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
            marginVertical: 4,
        },
        leftContainer: {
            width: '15%',
        },
        icon: {},
        centerContainer: {
            width: '85%',
            alignItems: 'flex-start',
            paddingHorizontal: 8,
            flexDirection: 'column',
        },
        siteTitle: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
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
    })

export default SiteTile
