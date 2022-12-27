import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { ActivityIndicator, ImageBackground, StyleSheet } from 'react-native'

import { Images } from '../assets/images'
import { useFederationsContext } from '../contexts/FederationsContext'
import { NavigationHook, RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Initializing'>

const Initializing: React.FC<Props> = () => {
    const navigation = useNavigation<NavigationHook>()
    const { theme } = useTheme()
    const {
        state: { selectedFederation },
    } = useFederationsContext()

    useEffect(() => {
        if (selectedFederation !== null) {
            navigation.replace('Home')
        } else {
            navigation.replace('Splash')
        }
    }, [navigation, selectedFederation])

    return (
        <ImageBackground
            resizeMode="cover"
            style={styles(theme).imageBackground}
            source={Images.HoloBackground}>
            <ActivityIndicator />
        </ImageBackground>
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
