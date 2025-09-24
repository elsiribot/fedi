import { useTheme, type Theme } from '@rneui/themed'
import React from 'react'
import { StyleSheet } from 'react-native'

import { selectLastUsedFederation } from '@fedi/common/redux/federation'

import { useAppSelector } from '../../../state/hooks'
import GradientView from '../../ui/GradientView'
import FederationTile from './FederationTile'

const FeaturedFederation: React.FC = () => {
    const { theme } = useTheme()
    const style = styles(theme)
    const lastUsedFederation = useAppSelector(selectLastUsedFederation)

    return (
        <GradientView variant="sky" style={style.container}>
            {lastUsedFederation && (
                <FederationTile federation={lastUsedFederation} />
            )}
        </GradientView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            padding: theme.spacing.lg,
            width: '100%',
            backgroundColor: theme.colors.secondary,
        },
    })

export default FeaturedFederation
