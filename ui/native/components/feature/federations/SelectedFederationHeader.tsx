import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { usePopupFederationInfo } from '@fedi/common/hooks/federation'
import { selectActiveFederation } from '@fedi/common/redux'

import { useAppSelector, usePrevious } from '../../../state/hooks'
import {
    DrawerNavigationHook,
    DRAWER_NAVIGATION_ID,
    NavigationHook,
} from '../../../types/navigation'
import { FederationLogo } from '../../ui/FederationLogo'
import SvgImage from '../../ui/SvgImage'
import { PopupFederationCountdown } from './PopupFederationCountdown'

const SelectedFederationHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const activeFederation = useAppSelector(selectActiveFederation)
    const previousActiveFederation = usePrevious(activeFederation)
    const popupInfo = usePopupFederationInfo()
    const drawerNavigator = navigation.getParent(
        DRAWER_NAVIGATION_ID,
    ) as DrawerNavigationHook

    const openFederationsDrawer = () => {
        drawerNavigator.openDrawer()
    }

    // Close the drawer when activeFederation changes
    useEffect(() => {
        if (previousActiveFederation?.id !== activeFederation?.id) {
            drawerNavigator.closeDrawer()
        }
    }, [drawerNavigator, activeFederation, previousActiveFederation?.id])

    return (
        <SafeAreaView
            edges={['top', 'left', 'right']}
            style={styles(theme).container}>
            <Pressable
                style={styles(theme).federation}
                onPress={openFederationsDrawer}>
                <FederationLogo federation={activeFederation} size={24} />
                <Text bold caption style={styles(theme).federationName}>
                    {activeFederation?.name}
                </Text>
                <SvgImage name="ChevronRight" size={20} />
            </Pressable>
            {popupInfo && <PopupFederationCountdown />}
        </SafeAreaView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: theme.spacing.sm,
            borderBottomColor: theme.colors.extraLightGrey,
            borderBottomWidth: 1,
        },
        federation: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.sm,
        },
        federationName: {
            marginLeft: theme.spacing.sm,
            marginRight: theme.spacing.xs,
        },
        headerContainer: {
            paddingBottom: theme.spacing.sm,
            borderBottomColor: theme.colors.extraLightGrey,
            borderBottomWidth: 1,
        },
    })

export default SelectedFederationHeader
