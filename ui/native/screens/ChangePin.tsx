import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useState } from 'react'
import { StyleSheet, View, useWindowDimensions } from 'react-native'

import { maxPinLength, pinNumbers } from '@fedi/common/constants/security'
import { numpadButtons } from '@fedi/common/hooks/amount'
import { selectPinDigits } from '@fedi/common/redux'

import PinDot from '../components/feature/pin/PinDot'
import { NumpadButton } from '../components/ui/NumpadButton'
import { useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'ChangePin'>

const ChangePin: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { width } = useWindowDimensions()
    const [pinDigits, setPinDigits] = useState<Array<number>>([])
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

                if (updatedDigits.length !== maxPinLength) return

                setTimeout(() => {
                    // Get the value at the 3000ms point in time without re-rendering
                    setPinDigits(digits => {
                        if (digits.length !== maxPinLength) return digits

                        if (
                            existingPinDigits &&
                            existingPinDigits.every((d, i) => d === digits[i])
                        ) {
                            navigation.navigate('CreatePin')
                            return digits
                        }

                        return []
                    })
                }, 1000)
            }
        },
        [pinDigits, navigation, existingPinDigits],
    )

    return (
        <View style={style.container}>
            <View style={style.content}>
                <View style={style.dots}>
                    {pinNumbers.map(i => (
                        <PinDot
                            key={i}
                            status={
                                pinDigits.length === maxPinLength
                                    ? isPinValid
                                        ? 'correct'
                                        : 'incorrect'
                                    : i > pinDigits.length
                                    ? 'empty'
                                    : 'active'
                            }
                            isLast={i === maxPinLength}
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

export default ChangePin
