import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { joinFederation, listFederations } from '../bridge'
import type { RootStackParamList } from '../Router'

export type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>

const Splash: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()

    const connectToFederation = async () => {
        try {
            await joinFederation('{"members":[[0,"ws://188.166.55.8:4001"]]}')
        } catch (e) {
            console.error('Failed to join federation', e)
            return
        }
        const federations = await listFederations()
        console.log('Federations: ', federations)
        navigation.navigate('Home')
    }

    return (
        <View style={styles.container}>
            <Button
                title={t('phrases.connect-to-federation')}
                onPress={connectToFederation}
            />
        </View>
    )
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
})

export default Splash
