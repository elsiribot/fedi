import { useNavigation } from '@react-navigation/native'
import { Icon, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { Federation } from '../../../bridge'
import { useFederationsContext } from '../../../state/contexts/FederationsContext'
import {
    DrawerNavigationHook,
    DRAWER_NAVIGATION_ID,
    NavigationHook,
} from '../../../types/navigation'
import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'

const SelectedFederationHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const { state } = useFederationsContext()
    const navigation = useNavigation<NavigationHook>()
    const selectedFederation: Federation | undefined = state.selectedFederation
    const drawerNavigator = navigation.getParent(
        DRAWER_NAVIGATION_ID,
    ) as DrawerNavigationHook

    const openFederationsDrawer = () => {
        drawerNavigator.openDrawer()
    }

    useEffect(() => {
        drawerNavigator.closeDrawer()
    }, [drawerNavigator, selectedFederation])

    return (
        <Header
            centerContainerStyle={{ flex: 10 }}
            headerCenter={
                <Pressable
                    style={styles(theme).container}
                    onPress={openFederationsDrawer}>
                    <SvgImage
                        name="FedearationxIcon"
                        svgProps={{
                            stroke: 'transparent',
                            height: 20,
                            width: 20,
                        }}
                    />
                    <Text medium small style={styles(theme).federationName}>
                        {selectedFederation?.name}
                    </Text>
                    <Icon
                        name={'angle-right'}
                        type="font-awesome"
                        size={theme.sizes.xs}
                    />
                </Pressable>
            }
            containerStyle={styles(theme).headerContainer}
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.sm,
        },
        federationName: {
            marginHorizontal: theme.spacing.sm,
        },
        image: {
            height: 20,
            width: 20,
            resizeMode: 'contain',
        },
        headerContainer: {
            marginTop: theme.spacing.lg,
        },
    })

export default SelectedFederationHeader
