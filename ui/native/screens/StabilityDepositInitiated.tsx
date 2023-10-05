import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { Theme } from '@rneui/themed'
import { useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'StabilityDepositInitiated'
>

const StabilityDepositInitiated: React.FC<Props> = () => {
    const { theme } = useTheme()

    const style = styles(theme)

    return (
        <View style={style.container}>
            <Text>StabilityDepositInitiated</Text>
        </View>
    )
}

const styles = (_theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
        },
    })

export default StabilityDepositInitiated
