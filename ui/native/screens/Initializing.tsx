import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { ImageBackground, StyleSheet } from 'react-native'

import {
    refreshChatCredentials,
    refreshFederations,
    selectActiveFederation,
    selectAuthenticatedMember,
    selectChatConnectionOptions,
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
    const [usernameRequired, setUsernameRequired] = useState<boolean>(false)
    const activeFederation = useAppSelector(selectActiveFederation)
    const connectionOptions = useAppSelector(selectChatConnectionOptions)
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)
    const hasLoaded = useAppSelector(selectHasLoadedFromStorage)

    const dispatch = useAppDispatch()
    const { activeFederationId, federations } = useAppSelector(
        s => s.federation,
    )

    // after localstorage has been checked call refreshFederations
    // to get an updated list from the bridge
    useEffect(() => {
        const initializeChatFeatures = async () => {
            console.info('initializeChatFeatures')
            if (authenticatedMember) {
                console.info(
                    'active federation',
                    activeFederationId,
                    'has a stored username... authenticating',
                    authenticatedMember.username,
                )
                await dispatch(
                    refreshChatCredentials({
                        fedimint,
                        federationId: activeFederationId!,
                    }),
                ).unwrap()

                return navigation.replace('TabsNavigator')
            } else {
                console.info(
                    'no username found for active federation',
                    activeFederationId,
                )
                setUsernameRequired(true)
            }
        }
        const initializeFederations = async () => {
            await dispatch(refreshFederations(fedimint)).unwrap()
        }
        // activeFederationId should be null if there are 0 federations so
        // this should only ever be called once
        if (activeFederationId) {
            if (federations.length === 0) {
                initializeFederations()
            }
            if (connectionOptions) {
                initializeChatFeatures()
            }
        }
    }, [
        dispatch,
        activeFederationId,
        authenticatedMember,
        connectionOptions,
        federations.length,
        navigation,
        federations,
    ])

    useEffect(() => {
        // If there are no stored usernames for the active federation
        // go to FederationWelcome to recover/create username
        // or go to Home if no chat is available
        if (activeFederation) {
            if (connectionOptions === null) {
                navigation.replace('TabsNavigator')
            } else if (authenticatedMember !== null) {
                navigation.replace('TabsNavigator')
            } else if (
                usernameRequired &&
                connectionOptions &&
                authenticatedMember === null
            ) {
                navigation.replace('FederationWelcome')
            }
        }
    }, [
        activeFederation,
        authenticatedMember,
        connectionOptions,
        navigation,
        usernameRequired,
    ])

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
