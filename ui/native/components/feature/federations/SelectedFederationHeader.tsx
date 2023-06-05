import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { usePopupFederationInfo } from '@fedi/common/hooks/federation'
import { selectActiveFederation } from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import {
    DrawerNavigationHook,
    DRAWER_NAVIGATION_ID,
    NavigationHook,
} from '../../../types/navigation'
import { FederationLogo } from '../../ui/FederationLogo'
import Header from '../../ui/Header'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'
import { PopupFederationCountdown } from './PopupFederationCountdown'

const SelectedFederationHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const activeFederation = useAppSelector(selectActiveFederation)
    const popupInfo = usePopupFederationInfo()
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
                <View style={styles(theme).container}>
                    <Pressable
                        style={styles(theme).federation}
                        onPress={openFederationsDrawer}>
                        <FederationLogo
                            federation={activeFederation}
                            size={20}
                        />
                        <Text bold caption style={styles(theme).federationName}>
                            {activeFederation?.name}
                        </Text>
                        <SvgImage name="ChevronRight" size={SvgImageSize.xs} />
                    </Pressable>
                    {popupInfo && <PopupFederationCountdown />}
                </View>
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
        },
        federation: {
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
            borderBottomColor: theme.colors.extraLightGrey,
            borderBottomWidth: 1,
        },
    })

export default SelectedFederationHeader
