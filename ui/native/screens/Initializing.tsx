import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'

import {
    selectAuthenticatedMember,
    selectHasSetMatrixDisplayName,
    selectMatrixAuth,
} from '@fedi/common/redux'
import { selectHasLoadedFromStorage } from '@fedi/common/redux/storage'

import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { useAppSelector } from '../state/hooks'
import { NavigationHook, RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Initializing'>

// TODO: Replace this entire screen with FediBridgeInitializer
const Initializing: React.FC<Props> = () => {
    const navigation = useNavigation<NavigationHook>()
    const { theme } = useTheme()
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)
    const matrixAuth = useAppSelector(selectMatrixAuth)
    const hasSetDisplayName = useAppSelector(selectHasSetMatrixDisplayName)
    const hasStorageLoaded = useAppSelector(selectHasLoadedFromStorage)

    const hasLoaded = hasStorageLoaded && !!matrixAuth
    const hasLegacyChatData = !!authenticatedMember

    // once everything has loaded, determine where to navigate
    useEffect(() => {
        const doNavigation = async () => {
            if (!hasLoaded) return

            // make sure there is a display name before navigating to Home
            if (hasSetDisplayName) {
                // Otherwise, go Home
                return navigation.replace('TabsNavigator')
            } else if (hasLegacyChatData) {
                // This is to support existing users with legacy chat data and send
                // them to Home so they can set a display name via the Upgrade Chat UX
                return navigation.replace('TabsNavigator')
            } else {
                // go to splash and have them set a display name
                return navigation.replace('Splash')
            }
        }
        doNavigation()
    }, [hasLegacyChatData, hasLoaded, hasSetDisplayName, navigation])

    return (
        <View style={styles(theme).container}>
            <SvgImage size={SvgImageSize.lg} name="FediLogoGradient" />
        </View>
    )
}

const styles = (_: Theme) =>
    StyleSheet.create({
        container: {
            height: '100%',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        },
        imageBackground: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
        },
    })

export default Initializing
