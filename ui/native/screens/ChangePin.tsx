import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View, useWindowDimensions } from 'react-native'

import { maxPinLength, pinNumbers } from '@fedi/common/constants/security'
import { numpadButtons } from '@fedi/common/hooks/amount'
import { useDebounce } from '@fedi/common/hooks/util'

import PinDot from '../components/feature/pin/PinDot'
import { NumpadButton } from '../components/ui/NumpadButton'
import type { RootStackParamList } from '../types/navigation'
import { usePin } from '../utils/hooks/security'

export type Props = NativeStackScreenProps<RootStackParamList, 'ChangePin'>

const ChangePin: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { width } = useWindowDimensions()
    const [pinDigits, setPinDigits] = useState<Array<number>>([])
    const debouncedPin = useDebounce(pinDigits)
    const pin = usePin()

    const handleNumpadPress = useCallback(
        (btn: (typeof numpadButtons)[number]) => {
            if (btn === null || pin.status !== 'set') return

            if (btn === 'backspace') {
                setPinDigits(pinDigits.slice(0, pinDigits.length - 1))
            } else if (pinDigits.length < maxPinLength) {
                const updatedDigits = [...pinDigits, btn]

                setPinDigits(updatedDigits)
            } else if (!pin.check(pinDigits)) {
                setPinDigits([btn])
            }
        },
        [pinDigits, pin],
    )

    const pinDigitStatus = (index: number) => {
        if (pinDigits.length === maxPinLength) {
            return pin.status === 'set' && pin.check(pinDigits)
                ? 'correct'
                : 'incorrect'
        }

        if (index > pinDigits.length) return 'empty'

        return 'active'
    }

    useEffect(() => {
        if (debouncedPin?.length !== maxPinLength || pin.status !== 'set')
            return

        if (pin.check(debouncedPin)) {
            navigation.navigate('CreatePin')
        } else {
            setPinDigits([])
        }
    }, [debouncedPin, navigation, pin])

    const style = styles(theme, width)

    return (
        <View style={style.container}>
            <View style={style.content}>
                <View style={style.dots}>
                    {pinNumbers.map(i => (
                        <PinDot
                            key={i}
                            status={pinDigitStatus(i)}
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
