import { useNavigation } from '@react-navigation/native'
import { useEffect, useRef, useState } from 'react'
import * as Keychain from 'react-native-keychain'
import { z } from 'zod'

import {
    ProtectedFeatures,
    selectDeviceId,
    selectIsFeatureUnlocked,
    selectProtectedFeatures,
} from '@fedi/common/redux'

import { useAppSelector } from '../../state/hooks'

interface UsePinLoading {
    status: 'loading'
}

interface UsePinUnset {
    status: 'unset'
    set: (digits: Array<number>) => Promise<void>
}

interface UsePinSet {
    status: 'set'
    check: (digits: Array<number>) => boolean
    set: (digits: Array<number>) => Promise<void>
}

type UsePinReturn = UsePinLoading | UsePinUnset | UsePinSet

export function usePin(): UsePinReturn {
    const [hasSetPin, setHasSetPin] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const checkRef = useRef<(digits: Array<number>) => boolean>(() => true)
    const deviceId = useAppSelector(selectDeviceId)

    const set = async (digits: Array<number>) => {
        if (!deviceId) return

        const parsedDigits = z
            .array(z.number().nonnegative().int().lte(9))
            .parse(digits)

        await Keychain.setGenericPassword(deviceId, parsedDigits.join(''), {
            service: 'pin',
        })
    }

    useEffect(() => {
        const loadPinCheck = async () => {
            const pin = await Keychain.getGenericPassword({ service: 'pin' })

            setIsLoading(false)

            if (
                pin &&
                pin.username === deviceId &&
                pin.service === 'pin' &&
                typeof pin.password === 'string'
            ) {
                setHasSetPin(true)
                checkRef.current = (digits: Array<number>) => {
                    const digitsValidation = z
                        .array(z.number().nonnegative().int().lte(9))
                        .safeParse(digits)

                    if (!digitsValidation.success) return false

                    return digits.join('') === pin.password
                }
            }
        }

        loadPinCheck()
    }, [deviceId])

    if (isLoading) return { status: 'loading' } as UsePinLoading

    if (hasSetPin)
        return { status: 'set', check: checkRef.current, set } as UsePinSet

    return { status: 'unset', set } as UsePinUnset
}

export function useProtectedFeature(
    feature: keyof ProtectedFeatures,
    condition = true,
) {
    const navigation = useNavigation()
    const isFeatureUnlocked = useAppSelector(s =>
        selectIsFeatureUnlocked(s, feature),
    )
    const isFeatureProtected = useAppSelector(selectProtectedFeatures)[feature]
    const { status } = usePin()

    useEffect(() => {
        if (
            isFeatureProtected &&
            !isFeatureUnlocked &&
            status === 'set' &&
            condition
        ) {
            navigation.navigate('LockScreen', { feature })
        }
    }, [
        isFeatureProtected,
        feature,
        navigation,
        isFeatureUnlocked,
        status,
        condition,
    ])
}
