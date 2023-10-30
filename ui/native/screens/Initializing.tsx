import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { ImageBackground, StyleSheet } from 'react-native'

import { useIsChatSupported } from '@fedi/common/hooks/federation'
import {
    refreshFederations,
    selectActiveFederation,
    selectAuthenticatedMember,
} from '@fedi/common/redux'
import { selectHasLoadedFromStorage } from '@fedi/common/redux/storage'

import { Images } from '../assets/images'
import { fedimint } from '../bridge'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import { NavigationHook, RootStackParamList } from '../types/navigation'
import { ErrorScreen } from './ErrorScreen'

export type Props = NativeStackScreenProps<RootStackParamList, 'Initializing'>

const Initializing: React.FC<Props> = () => {
    const dispatch = useAppDispatch()
    const navigation = useNavigation<NavigationHook>()
    const { theme } = useTheme()
    const activeFederation = useAppSelector(selectActiveFederation)
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)
    const hasStorageLoaded = useAppSelector(selectHasLoadedFromStorage)
    const isChatSupported = useIsChatSupported()
    const [hasRefreshedFederations, setHasRefreshedFederations] =
        useState(false)
    const [bridgeError, setBridgeError] = useState<unknown | null>(null)

    const hasLoaded = hasStorageLoaded && hasRefreshedFederations
    const hasFederation = !!activeFederation
    const hasAuthenticatedMember = !!authenticatedMember

    // Refresh federations from bridge
    useEffect(() => {
        const initializeFederations = async () => {
            try {
                await dispatch(refreshFederations(fedimint)).unwrap()
                setHasRefreshedFederations(true)
            } catch (err) {
                console.error('initializeFederations', err)
                setBridgeError(err)
            }
        }
        initializeFederations()
    }, [dispatch])

    // once everything has loaded, determine where to navigate
    useEffect(() => {
        if (!hasLoaded) return

        if (hasFederation) {
            // if chat is supported but auth is not set, recover/create username
            // TODO: move this out of initializing, this will only send us here
            // on first launch of app, but won't catch if you switch to a
            // federation that's in this state!
            if (isChatSupported && !hasAuthenticatedMember) {
                return navigation.replace('CreateUsername')
            }
            // Otherwise, go Home
            return navigation.replace('TabsNavigator')
        } else {
            // If they don't have a federation, go to the splash screen
            return navigation.replace('Splash')
        }
    }, [
        hasLoaded,
        hasFederation,
        hasAuthenticatedMember,
        isChatSupported,
        navigation,
    ])

    if (bridgeError) {
        return <ErrorScreen error={bridgeError} />
    }

    return (
        <ImageBackground
            resizeMode="cover"
            style={styles(theme).imageBackground}
            source={Images.HoloBackground}
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        imageBackground: {
            ...theme.styles.h100w100,
            justifyContent: 'space-evenly',
        },
    })

export default Initializing
