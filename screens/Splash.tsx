import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Image, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ImageBackground, StyleSheet, View } from 'react-native'

import { joinFederation, listFederations } from '../bridge'
import { Images } from '../assets/images'
import {
    changeSelectedFederation,
    updateConnectedFederations,
    useFederationsContext,
} from '../contexts/FederationsContext'
import { TEST_FEDERATION } from '../constants'
import { MAIN_NAVIGATOR_ID, RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>

const Splash: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { dispatch } = useFederationsContext()

    const connectToTestFederation = async () => {
        try {
            await joinFederation(TEST_FEDERATION)
        } catch (e) {
            console.error('Failed to join federation', e)
            return
        }
        const federations = await listFederations()
        if (federations.length > 0) {
            dispatch(updateConnectedFederations(federations))
            dispatch(changeSelectedFederation(federations[0]))
            navigation.getParent(MAIN_NAVIGATOR_ID)?.navigate('Home')
        }
    }

    const handleJoinFederation = async () => {
        navigation.navigate('ScanFederationCode')
    }

    return (
        <ImageBackground
            resizeMode="cover"
            style={styles(theme).imageBackground}
            source={Images.HoloBackground}>
            <View style={styles(theme).container}>
                <Image source={Images.FediLogo} style={styles(theme).image} />
                <Button
                    title={t('feature.federations.join-federation')}
                    onPress={handleJoinFederation}
                />
                <Button
                    title={t('phrases.connect-to-federation')}
                    onPress={connectToTestFederation}
                    type="clear"
                />
            </View>
        </ImageBackground>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-evenly',
        },
        imageBackground: {
            height: '100%',
            width: '100%',
            resizeMode: 'cover',
        },
        image: {
            height: 32,
            width: 120,
            resizeMode: 'contain',
        },
    })

export default Splash
