import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
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

export type Props = NativeStackScreenProps<RootStackParamList, 'Initializing'>

const Initializing: React.FC<Props> = () => {
    const navigation = useNavigation<NavigationHook>()
    const { theme } = useTheme()
    const activeFederation = useAppSelector(selectActiveFederation)
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)
    const hasLoaded = useAppSelector(selectHasLoadedFromStorage)
    const isChatSupported = useIsChatSupported()

    const dispatch = useAppDispatch()
    const { activeFederationId, federations } = useAppSelector(
        s => s.federation,
    )

    // once active federation ID is loaded from storage, call refreshFederations
    // to get an updated list from the bridge
    useEffect(() => {
        const initializeFederations = async () => {
            try {
                await dispatch(refreshFederations(fedimint)).unwrap()
            } catch (error) {
                console.error('initializeFederations', error)
            }
        }
        // activeFederationId should be null if there are 0 federations so
        // this should only ever be called once
        if (activeFederationId && federations.length === 0) {
            initializeFederations()
        }
    }, [dispatch, activeFederationId, federations.length])

    // once federation is active, determine where to navigate
    useEffect(() => {
        if (activeFederation) {
            // if chat is not supported, go Home
            if (!isChatSupported) {
                return navigation.replace('TabsNavigator')
            }
            // if chat is supported and auth is set, go Home
            if (isChatSupported && authenticatedMember !== null) {
                return navigation.replace('TabsNavigator')
            }
            // if chat is supported but auth is not set, recover/create username
            if (isChatSupported && authenticatedMember === null) {
                return navigation.replace('CreateUsername')
            }
        }
    }, [activeFederation, authenticatedMember, isChatSupported, navigation])

    // if there is no active federation go to the splash page to join
    useEffect(() => {
        if (hasLoaded && !activeFederationId) {
            navigation.replace('Splash')
        }
    }, [navigation, dispatch, activeFederationId, hasLoaded])

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
