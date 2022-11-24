import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { Button, Icon, Text } from '@rneui/themed'

import type { RootStackParamList } from '../Router'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'OnChainReceiveSuccess'
>

const OnChainReceiveSuccess: React.FC<Props> = ({
    route,
    navigation,
}: Props) => {
    const { t } = useTranslation()
    const { amountReceived } = route.params

    return (
        <View style={styles.container}>
            <View style={styles.detailsContainer}>
                <Icon name="check" />
                <Text h3>{t('feature.receive.pending-transaction')}</Text>
                <Text h3>{`${amountReceived} ${t('words.sats')}`}</Text>
            </View>
            <View style={styles.buttonContainer}>
                <Button
                    title={t('words.done')}
                    onPress={() => {
                        navigation.navigate('Home')
                    }}
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
    detailsContainer: {
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonContainer: {
        width: '90%',
        marginBottom: 50,
    },
})

export default OnChainReceiveSuccess
