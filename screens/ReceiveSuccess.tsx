import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, ImageBackground, StyleSheet, View } from 'react-native'
import { Button, Icon, Text, Theme, useTheme } from '@rneui/themed'

import type { RootStackParamList } from '../Router'
import { Images } from '../assets/images'
import amountUtils from '../utils/AmountUtils'

export type Props = NativeStackScreenProps<RootStackParamList, 'ReceiveSuccess'>

const ReceiveSuccess: React.FC<Props> = ({ route, navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { tx } = route.params

    return (
        <ImageBackground
            source={Images.HoloBackground}
            style={styles(theme).container}>
            <View style={styles(theme).detailsContainer}>
                <Icon name="check" style={styles(theme).icon} />
                <Text h3>
                    {t(
                        tx.type === 'bitcoin'
                            ? 'feature.receive.pending-transaction'
                            : 'feature.receive.you-received',
                    )}
                </Text>
                <Text h3>{`${amountUtils.toSats(tx.amount)} ${t(
                    'words.sats',
                )}`}</Text>
            </View>
            <View style={styles(theme).buttonContainer}>
                <Button
                    title={t('words.done')}
                    onPress={() => {
                        navigation.navigate('Home')
                    }}
                />
            </View>
        </ImageBackground>
    )
}

const WINDOW_WIDTH = Dimensions.get('window').width
const CIRCLE_SIZE = WINDOW_WIDTH * 0.85

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-end',
        },
        detailsContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.secondary,
            // for a perfect circle borderRadius should be half of
            // height and width
            height: CIRCLE_SIZE,
            width: CIRCLE_SIZE,
            borderRadius: CIRCLE_SIZE * 0.5,
            shadowRadius: 1,
            shadowOffset: {
                width: 0,
                height: 2,
            },
            elevation: 1,
            shadowColor: theme.colors.primaryLight,
        },
        icon: {
            marginVertical: 10,
        },
        buttonContainer: {
            width: '90%',
            height: '30%',
            marginBottom: 50,
            flexDirection: 'column',
            justifyContent: 'flex-end',
        },
    })

export default ReceiveSuccess
