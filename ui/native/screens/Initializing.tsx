import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { ImageBackground, StyleSheet } from 'react-native'

import {
    changeAuthenticatedGuardian,
    refreshChatCredentials,
    refreshFederations,
    selectActiveFederation,
    selectAuthenticatedMember,
    setActiveFederationId,
} from '@fedi/common/redux'

import { Images } from '../assets/images'
import { fedimint } from '../bridge'
import {
    ACTIVE_FEDERATION_ID_DB_KEY,
    AUTHENTICATED_GUARDIAN_DB_KEY,
} from '../constants'
import { useChatContext } from '../state/contexts/ChatContext'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import { NavigationHook, RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Initializing'>

const Initializing: React.FC<Props> = ({ route }: Props) => {
    const navigation = useNavigation<NavigationHook>()
    const { theme } = useTheme()
    const { reset } = route.params
    const { connectionOptions } = useChatContext().state
    const [usernameRequired, setUsernameRequired] = useState<boolean>(false)
    const activeFederation = useAppSelector(selectActiveFederation)
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)

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

    // this useEffect checks async storage to restore
    // federations state on a fresh app load
    useEffect(() => {
        const restoreState = async () => {
            const restoreFederationsState = async () => {
                try {
                    // load selected federation id from async storage
                    const saved = await AsyncStorage.getItem(
                        ACTIVE_FEDERATION_ID_DB_KEY,
                    )
                    const savedJson = saved ? JSON.parse(saved) : null

                    if (savedJson) {
                        // this logic must be reached to trigger any useEffects
                        const savedFederation = savedJson.activeFederation
                        console.info('saved federation', savedFederation)
                        if (savedFederation?.id) {
                            dispatch(setActiveFederationId(savedFederation?.id))
                            // load selected federation id from async storage
                            const savedGuardian = await AsyncStorage.getItem(
                                AUTHENTICATED_GUARDIAN_DB_KEY,
                            )
                            const savedGuardianJson = savedGuardian
                                ? JSON.parse(savedGuardian)
                                : null

                            if (savedGuardianJson) {
                                const { authenticatedGuardian } =
                                    savedGuardianJson
                                console.info(
                                    'restoring guardian',
                                    authenticatedGuardian?.name,
                                )
                                dispatch(
                                    changeAuthenticatedGuardian(
                                        authenticatedGuardian,
                                    ),
                                )
                            }
                        }
                    } else {
                        // if there is nothing in localstorage go to Splash
                        return navigation.replace('Splash')
                    }
                } catch (error) {
                    console.error('restoreState error', error)
                    return navigation.replace('Splash')
                }
            }

            restoreFederationsState()
        }

        if (!activeFederationId) {
            restoreState()
        }
    }, [navigation, reset, dispatch, activeFederationId])

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
