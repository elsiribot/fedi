import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { selectActiveFederation } from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import {
    DrawerNavigationHook,
    DRAWER_NAVIGATION_ID,
    NavigationHook,
} from '../../../types/navigation'
import Header from '../../ui/Header'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

const SelectedFederationHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const activeFederation = useAppSelector(selectActiveFederation)
    const drawerNavigator = navigation.getParent(
        DRAWER_NAVIGATION_ID,
    ) as DrawerNavigationHook

    const openFederationsDrawer = () => {
        drawerNavigator.openDrawer()
    }

    // Close the drawer when activeFederation changes
    useEffect(() => {
        drawerNavigator.closeDrawer()
    }, [drawerNavigator, activeFederation])

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
                        {activeFederation?.name}
                    </Text>
                    <SvgImage name="ChevronRight" size={SvgImageSize.xs} />
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
