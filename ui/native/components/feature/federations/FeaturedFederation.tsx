import { useTheme, type Theme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { selectLastUsedFederation } from '@fedi/common/redux/federation'

import { useAppSelector } from '../../../state/hooks'
import FederationTile from './FederationTile'

const FeaturedFederation: React.FC = () => {
    const { theme } = useTheme()
    const style = styles(theme)
    const lastUsedFederation = useAppSelector(selectLastUsedFederation)

    return (
        // <HoloGradient level="m500" gradientStyle={style.gradientContainer}>
        // {lastUsedFederation && (
        //     <FederationTile federation={lastUsedFederation} />
        // )}
        // </HoloGradient>
        <View style={style.container}>
            {lastUsedFederation && (
                <FederationTile federation={lastUsedFederation} />
            )}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            paddingHorizontal: theme.spacing.lg,
            width: '100%',
            backgroundColor: theme.colors.secondary,
        },
        gradientContainer: {
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            paddingHorizontal: theme.spacing.lg,
            width: '100%',
        },
    })

export default FeaturedFederation
