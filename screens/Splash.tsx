import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Image } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ImageBackground, StyleSheet, View } from 'react-native'
import { Camera } from 'react-native-vision-camera'

import { joinFederation, listFederations } from '../bridge'
import type { RootStackParamList } from '../Router'
import { Images } from '../assets/images'
import {
    changeSelectedFederation,
    updateConnectedFederations,
    useFederationsContext,
} from '../contexts/FederationsContext'
import { TEST_FEDERATION } from '../constants'

export type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>

const Splash: React.FC<Props> = ({ navigation }: Props) => {
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

            // temp workaround for iOS until #46 is fixed
            if (federations[0] === null) {
                dispatch(changeSelectedFederation({ name: 'fed0' }))
            } else {
                dispatch(changeSelectedFederation(federations[0]))
            }
            navigation.getParent('MainStackNavigator').navigate('Home')
        }
    }

    const handleJoinFederation = async () => {
        const status = await Camera.getCameraPermissionStatus()
        console.log('status', status)
        if (status === 'authorized') {
            navigation.navigate('ScanFederationCode')
        } else {
            navigation.navigate('RequestCameraAccess')
        }
    }

    return (
        <ImageBackground
            resizeMode="cover"
            style={styles.imageBackground}
            source={Images.HoloBackground}>
            <View style={styles.container}>
                <Image source={Images.FediLogo} style={styles.image} />
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
const styles = StyleSheet.create({
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
