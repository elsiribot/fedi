import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import DeviceInfo from 'react-native-device-info'
import { SafeAreaView } from 'react-native-safe-area-context'

import { usePopupFederationInfo } from '@fedi/common/hooks/federation'
import {
    selectActiveFederation,
    selectShouldShowUpgradeChat,
} from '@fedi/common/redux'

import { useAppSelector, usePrevious } from '../../../state/hooks'
import {
    DrawerNavigationHook,
    DRAWER_NAVIGATION_ID,
    NavigationHook,
} from '../../../types/navigation'
import { FederationLogo } from '../../ui/FederationLogo'
import SvgImage from '../../ui/SvgImage'
import { PopupFederationCountdown } from './PopupFederationCountdown'

const SelectedFederationHeader: React.FC = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const activeFederation = useAppSelector(selectActiveFederation)
    const shouldShowUpgradeChat = useAppSelector(selectShouldShowUpgradeChat)
    const previousActiveFederation = usePrevious(activeFederation)
    const popupInfo = usePopupFederationInfo()
    const drawerNavigator = navigation.getParent(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        DRAWER_NAVIGATION_ID as any,
    ) as DrawerNavigationHook

    // Checks to see if we are on the Chat screen within the TabsNavigator
    const navState = navigation.getState()
    const isOnChatScreen = useMemo(() => {
        const currentScreen = navState.routes[navState.index]
        if (currentScreen.state && currentScreen.state.index) {
            const currentTab =
                currentScreen.state.routes[currentScreen.state.index]
            if (currentTab.name === 'Chat') {
                return true
            }
        }
        return false
    }, [navState])

    const isOnModsScreen = useMemo(() => {
        const currentScreen = navState.routes[navState.index]

        if (currentScreen.state && currentScreen.state.index) {
            const currentTab =
                currentScreen.state.routes[currentScreen.state.index]
            if (currentTab.name === 'Mods') {
                return true
            }
        }

        return false
    }, [navState])

    const openFederationsDrawer = () => {
        drawerNavigator.openDrawer()
    }

    // Close the drawer when activeFederation changes
    useEffect(() => {
        if (previousActiveFederation?.id !== activeFederation?.id) {
            drawerNavigator.closeDrawer()
        }
    }, [drawerNavigator, activeFederation, previousActiveFederation?.id])

    const shouldHide =
        (isOnChatScreen && shouldShowUpgradeChat) || isOnModsScreen

    const style = styles(theme)

    return (
        <SafeAreaView
            edges={['top', 'left', 'right']}
            style={[
                styles(theme).container,
                // hide the header if showing the upgrade chat screen
                isOnChatScreen && shouldShowUpgradeChat ? { opacity: 0 } : {},
            ]}>
            {/* don't render this if the user has not joined any federations */}
            {activeFederation && (
                <Pressable
                    style={[style.federation]}
                    onPress={openFederationsDrawer}>
                    <FederationLogo federation={activeFederation} size={24} />
                    <Text
                        bold
                        caption
                        numberOfLines={1}
                        style={style.federationName}>
                        {activeFederation?.name}
                    </Text>
                    <SvgImage name="ChevronRight" size={20} />
                </Pressable>
            )}
            {popupInfo && <PopupFederationCountdown />}
            {/* Display a small UI indicator for Fedi Nightly builds */}
            {DeviceInfo.getBundleId().includes('nightly') && (
                <View style={style.nightly}>
                    <Text small style={style.nightlyText}>
                        {t('feature.developer.nightly')}
                    </Text>
                </View>
            )}
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
        nightly: {
            position: 'absolute',
            bottom: 0,
            right: theme.spacing.lg,
            backgroundColor: theme.colors.primary,
            paddingHorizontal: theme.spacing.sm,
            borderTopLeftRadius: 5,
            borderTopRightRadius: 5,
        },
        nightlyText: {
            fontSize: 10,
            color: theme.colors.secondary,
        },
        federation: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.sm,
        },
        federationName: {
            maxWidth: '80%',
            marginLeft: theme.spacing.sm,
            marginRight: theme.spacing.xs,
        },
        headerContainer: {
            paddingBottom: theme.spacing.sm,
            borderBottomColor: theme.colors.extraLightGrey,
            borderBottomWidth: 1,
        },
        unreadIndicator: {
            backgroundColor: theme.colors.red,
            height: theme.sizes.unreadIndicatorSize,
            width: theme.sizes.unreadIndicatorSize,
            borderRadius: theme.sizes.unreadIndicatorSize * 0.5,
            position: 'absolute',
            right: 0,
        },
    })

export default SelectedFederationHeader
