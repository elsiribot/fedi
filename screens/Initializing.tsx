import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { ImageBackground, StyleSheet } from 'react-native'

import { Images } from '../assets/images'
import { FEDERATIONS_PERSISTENCE_KEY } from '../constants'
import {
    changeSelectedFederation,
    resetFederationsState,
    updateConnectedFederations,
    useFederationsContext,
} from '../state/contexts/FederationsContext'
import { NavigationHook, RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Initializing'>

const Initializing: React.FC<Props> = ({ route }: Props) => {
    const navigation = useNavigation<NavigationHook>()
    const { theme } = useTheme()
    const { reset } = route.params
    const { dispatch } = useFederationsContext()

    // this useEffect checks async storage to restore
    // federations state on a fresh app load
    useEffect(() => {
        const restoreState = async () => {
            try {
                const savedFederationsStateJson = await AsyncStorage.getItem(
                    FEDERATIONS_PERSISTENCE_KEY,
                )

                const savedFederationsState = savedFederationsStateJson
                    ? JSON.parse(savedFederationsStateJson)
                    : null

                console.info('savedFederationsState', savedFederationsState)

                if (savedFederationsState !== null) {
                    const { selectedFederation, connectedFederations } =
                        savedFederationsState

                    dispatch(changeSelectedFederation(selectedFederation))
                    dispatch(updateConnectedFederations(connectedFederations))
                    return navigation.replace('Home')
                }
            } catch (error) {
                console.error(error)
            }
            navigation.replace('Splash')
        }

        if (reset === true) {
            dispatch(resetFederationsState())
            navigation.navigate('Splash')
        } else {
            restoreState()
        }
    }, [dispatch, navigation, reset])

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
