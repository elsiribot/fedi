import { useNavigation } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme } from '@rneui/themed'
import { useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import * as Progress from 'react-native-progress'

import type { NavigationHook, RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'StabilityHome'>

const StabilityHome: React.FC<Props> = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()

    const style = styles(theme)

    return (
        <View style={style.container}>
            <View style={style.balanceContainer}>
                <Progress.Circle
                    progress={1}
                    color={theme.colors.primaryVeryLight}
                    thickness={theme.sizes.stabilityPoolCircleThickness}
                    size={theme.sizes.stabilityPoolCircle}
                    borderWidth={1}
                />
            </View>
            <View style={style.buttonContainer}>
                <Button
                    containerStyle={[style.button]}
                    onPress={() => navigation.navigate('StabilityDeposit')}
                    title={
                        <Text medium caption style={style.buttonText}>
                            {t('words.deposit')}
                        </Text>
                    }
                />
                <Button
                    containerStyle={[style.button]}
                    onPress={() => navigation.navigate('StabilityWithdraw')}
                    title={
                        <Text medium caption style={style.buttonText}>
                            {t('words.withdraw')}
                        </Text>
                    }
                />
            </View>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.md,
        },
        balanceContainer: {
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 'auto',
        },
        buttonContainer: {
            width: '100%',
            flexDirection: 'row',
            marginTop: 'auto',
            gap: 20,
        },
        button: {
            flex: 1,
        },
        buttonText: {
            color: theme.colors.secondary,
        },
    })

export default StabilityHome
