import {
    DrawerContentComponentProps,
    DrawerContentScrollView,
    DrawerItem,
} from '@react-navigation/drawer'
import React, { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { Button, Theme, useTheme } from '@rneui/themed'
import {
    changeSelectedFederation,
    resetFederationsState,
    updateConnectedFederations,
    useFederationsContext,
} from '../../../contexts/FederationsContext'
import { listFederations } from '../../../bridge'

const ConnectedFederationsDrawer: React.FC<DrawerContentComponentProps> = (
    props: DrawerContentComponentProps,
) => {
    const { theme } = useTheme()
    const { state, dispatch } = useFederationsContext()
    const { selectedFederation, connectedFederations } = state

    useEffect(() => {
        const refreshFederations = async () => {
            const federations = await listFederations()
            console.log('Federations: ', federations)
            if (federations.length > 0) {
                dispatch(updateConnectedFederations(federations))
            }
        }

        refreshFederations()
    }, [dispatch])

    return (
        <DrawerContentScrollView {...props} style={styles(theme).container}>
            {connectedFederations.map((f, i) => (
                <DrawerItem
                    key={`di-${i}`}
                    label={f.name}
                    focused={f.name === selectedFederation?.name}
                    onPress={() => {
                        dispatch(changeSelectedFederation(f))
                    }}
                />
            ))}
            {/* For dev purposes only */}
            <Button
                title={'Reset Federations State'}
                type="clear"
                onPress={() => {
                    dispatch(resetFederationsState())
                }}
            />
        </DrawerContentScrollView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            backgroundColor: theme.colors.secondary,
        },
    })

export default ConnectedFederationsDrawer
