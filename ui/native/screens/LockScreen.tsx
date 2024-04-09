import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import {
    BackHandler,
    StyleSheet,
    View,
    useWindowDimensions,
} from 'react-native'

import { numpadButtons } from '@fedi/common/hooks/amount'
import { selectPinDigits, setFeatureUnlocked } from '@fedi/common/redux'

import PinDot from '../components/feature/pin/PinDot'
import { NumpadButton } from '../components/ui/NumpadButton'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'LockScreen'>

const maxPinLength = 4

const LockScreen: React.FC<Props> = ({ navigation, route }: Props) => {
    const { theme } = useTheme()
    const { width } = useWindowDimensions()
    const { feature } = route.params
    const [pinDigits, setPinDigits] = useState<Array<number>>([])
    const dispatch = useAppDispatch()
    const existingPinDigits = useAppSelector(selectPinDigits)

    const isPinValid =
        existingPinDigits === null ||
        existingPinDigits.every((d, i) => d === pinDigits[i])

    const style = styles(theme, width)

    const handleNumpadPress = useCallback(
        (btn: (typeof numpadButtons)[number]) => {
            if (btn === null) return

            if (btn === 'backspace') {
                setPinDigits(pinDigits.slice(0, pinDigits.length - 1))
            } else if (pinDigits.length < maxPinLength) {
                const updatedDigits = [...pinDigits, btn]

                setPinDigits(updatedDigits)

                if (updatedDigits.length === maxPinLength) {
                    setTimeout(() => {
                        // Get the value at the 3000ms point in time without re-rendering
                        setPinDigits(digits => {
                            if (digits.length === maxPinLength) {
                                if (
                                    existingPinDigits &&
                                    existingPinDigits.every(
                                        (d, i) => d === digits[i],
                                    )
                                ) {
                                    dispatch(
                                        setFeatureUnlocked({
                                            key: feature,
                                            unlocked: true,
                                        }),
                                    )
                                    if (navigation.canGoBack())
                                        navigation.goBack()
                                    else navigation.navigate('TabsNavigator')
                                    return digits
                                } else {
                                    return []
                                }
                            }

                            return digits
                        })
                    }, 500)
                }
            }
        },
        [pinDigits, dispatch, navigation, existingPinDigits, feature],
    )

    useEffect(() => {
        const backAction = () => {
            return true
        }

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction,
        )

        return () => backHandler.remove()
    }, [])

    return (
        <View style={style.container}>
            <View style={style.content}>
                <View style={style.dots}>
                    {new Array(maxPinLength).fill(null).map((_, i) => (
                        <PinDot
                            key={i}
                            status={
                                pinDigits.length === maxPinLength
                                    ? isPinValid
                                        ? 'correct'
                                        : 'incorrect'
                                    : i >= pinDigits.length
                                    ? 'empty'
                                    : 'active'
                            }
                            isLast={i === maxPinLength - 1}
                        />
                    ))}
                </View>
            </View>
            <View style={style.numpad}>
                {numpadButtons.map(btn => (
                    <NumpadButton
                        key={btn}
                        btn={btn}
                        onPress={() => handleNumpadPress(btn)}
                    />
                ))}
            </View>
        </View>
    )
}

const styles = (theme: Theme, width: number) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.xl,
        },
        dots: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
        },
        content: {
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 32,
        },
        numpad: {
            width: '100%',
            maxWidth: Math.min(400, width),
            paddingHorizontal: theme.spacing.lg,
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
    })

export default LockScreen
