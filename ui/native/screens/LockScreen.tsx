import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View, useWindowDimensions } from 'react-native'

import { maxPinLength, pinNumbers } from '@fedi/common/constants/security'
import { numpadButtons } from '@fedi/common/hooks/amount'
import { useDebounce } from '@fedi/common/hooks/util'
import { ProtectedFeatures, setFeatureUnlocked } from '@fedi/common/redux'

import PinDot from '../components/feature/pin/PinDot'
import { NumpadButton } from '../components/ui/NumpadButton'
import { useAppDispatch } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'
import { usePin } from '../utils/hooks/security'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    keyof RootStackParamList
>

const LockScreen = <T extends keyof RootStackParamList>({
    navigation,
    feature,
    screen,
}: Props & {
    feature: keyof ProtectedFeatures
    screen: [
        ...(T extends unknown
            ? undefined extends RootStackParamList[T]
                ? [screen: T] | [screen: T, params: RootStackParamList[T]]
                : [screen: T, params: RootStackParamList[T]]
            : never),
    ]
}) => {
    const { theme } = useTheme()
    const { width } = useWindowDimensions()
    const pin = usePin()
    const [pinDigits, setPinDigits] = useState<Array<number>>([])
    const dispatch = useAppDispatch()
    const debouncedPin = useDebounce(pinDigits, 500)

    const style = styles(theme, width)

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

    const dotStatus = useCallback(
        (index: number) => {
            if (pinDigits.length === maxPinLength) {
                if (pin.status === 'set' && pin.check(pinDigits)) {
                    return 'correct'
                }

                return 'incorrect'
            }

            if (index > pinDigits.length) {
                return 'empty'
            }

            return 'active'
        },
        [pinDigits, pin],
    )

    useEffect(() => {
        if (
            debouncedPin?.length !== maxPinLength ||
            pin.status !== 'set' ||
            !pin.check(debouncedPin)
        )
            return

        dispatch(
            setFeatureUnlocked({
                key: feature,
                unlocked: true,
            }),
        )

        navigation.navigate(...screen)
    }, [debouncedPin, feature, navigation, dispatch, pin, screen])

    return (
        <View style={style.container}>
            <View style={style.content}>
                <View style={style.dots}>
                    {pinNumbers.map(i => (
                        <PinDot
                            key={i}
                            status={dotStatus(i)}
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

export default LockScreen
