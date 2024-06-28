import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { selectActiveFederation } from '@fedi/common/redux'

import { useAppSelector, usePrevious } from '../../../state/hooks'
import {
    DrawerNavigationHook,
    DRAWER_NAVIGATION_ID,
    NavigationHook,
} from '../../../types/navigation'
import { FederationLogo } from '../../ui/FederationLogo'
import HoloGradient from '../../ui/HoloGradient'

const FederationSelector: React.FC = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const activeFederation = useAppSelector(selectActiveFederation)
    const previousActiveFederation = usePrevious(activeFederation)
    const drawerNavigator = navigation.getParent(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        DRAWER_NAVIGATION_ID as any,
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

    const style = styles(theme)

    if (!activeFederation) return <></>

    return (
        <>
            <HoloGradient
                level="900"
                style={style.gradientContainer}
                gradientStyle={style.gradient}>
                <Pressable
                    style={style.container}
                    onPress={openFederationsDrawer}>
                    <FederationLogo federation={activeFederation} size={24} />
                    <Text
                        bold
                        caption
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        style={style.federationName}>
                        {activeFederation?.name}
                    </Text>
                </Pressable>
            </HoloGradient>
        </>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        gradientContainer: {
            borderRadius: 50,
            ...theme.styles.subtleShadow,
        },
        gradient: {
            padding: theme.spacing.xxs,
            borderRadius: 50,
        },
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'stretch',
            paddingVertical: theme.spacing.xs,
            paddingHorizontal: theme.spacing.md,
            // margin: theme.spacing.xxs,
            gap: theme.spacing.sm,
            borderRadius: 50,
            backgroundColor: theme.colors.white,
        },
        federationName: {
            flexGrow: 1,
            maxWidth: '80%',
        },
    })

export default FederationSelector
