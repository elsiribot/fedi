import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import {
    BackHandler,
    StyleSheet,
    View,
    useWindowDimensions,
} from 'react-native'

import { maxPinLength, pinNumbers } from '@fedi/common/constants/security'
import { numpadButtons } from '@fedi/common/hooks/amount'
import { usePin } from '@fedi/common/hooks/security'
import { useDebounce } from '@fedi/common/hooks/util'
import { setFeatureUnlocked } from '@fedi/common/redux'

import PinDot from '../components/feature/pin/PinDot'
import { NumpadButton } from '../components/ui/NumpadButton'
import { useAppDispatch } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'LockScreen'>

const LockScreen: React.FC<Props> = ({ navigation, route }: Props) => {
    const { theme } = useTheme()
    const { width } = useWindowDimensions()
    const { feature } = route.params
    const { check } = usePin()
    const [pinDigits, setPinDigits] = useState<Array<number>>([])
    const dispatch = useAppDispatch()
    const debouncedPin = useDebounce(pinDigits, 500)

    const style = styles(theme, width)

    const handleNumpadPress = useCallback(
        (btn: (typeof numpadButtons)[number]) => {
            if (btn === null) return

            if (btn === 'backspace') {
                setPinDigits(pinDigits.slice(0, pinDigits.length - 1))
            } else if (pinDigits.length < maxPinLength) {
                const updatedDigits = [...pinDigits, btn]

                setPinDigits(updatedDigits)
            }
        },
        [pinDigits],
    )

    const dotStatus = useCallback(
        (index: number) => {
            if (pinDigits.length === maxPinLength) {
                if (check && check(pinDigits)) {
                    return 'correct'
                }

                return 'incorrect'
            }

            if (index >= pinDigits.length) {
                return 'empty'
            }

            return 'active'
        },
        [check, pinDigits],
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

    useEffect(() => {
        if (debouncedPin?.length !== maxPinLength || !check) return

        if (check(debouncedPin)) {
            dispatch(
                setFeatureUnlocked({
                    key: feature,
                    unlocked: true,
                }),
            )
            if (navigation.canGoBack()) navigation.goBack()
            else navigation.navigate('TabsNavigator')
        } else {
            setPinDigits([])
        }
    }, [debouncedPin, feature, navigation, dispatch, check])

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
