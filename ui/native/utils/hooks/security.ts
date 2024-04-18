import { useCallback, useEffect, useRef, useState } from 'react'
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
    unset: () => Promise<void>
}

type UsePinReturn = UsePinLoading | UsePinUnset | UsePinSet

/**
 * Returns a `set` function if no pin has been set.
 * Returns both a `set`, `unset` and `check` function if a pin has been set.
 * Always returns a `status`
 */
export function usePin(): UsePinReturn {
    const [hasSetPin, setHasSetPin] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const checkRef = useRef<(digits: Array<number>) => boolean>(() => true)
    const deviceId = useAppSelector(selectDeviceId)

    const set = useCallback(
        async (digits: Array<number>) => {
            if (!deviceId) return

            const parsedDigits = z
                .array(z.number().nonnegative().int().lte(9))
                .parse(digits)

            await Keychain.setGenericPassword(deviceId, parsedDigits.join(''), {
                service: 'pin',
            })
        },
        [deviceId],
    )

    const unset = useCallback(async () => {
        if (!deviceId) return

        await Keychain.resetGenericPassword({
            service: 'pin',
        })
    }, [deviceId])

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
        return {
            status: 'set',
            check: checkRef.current,
            set,
            unset,
        } as UsePinSet

    return { status: 'unset', set } as UsePinUnset
}

/** Returns whether a pin-protected feature is unlocked or not. If a pin is not set or the feature is not pin-protected,
 * returns true */
export const useIsFeatureUnlocked = (feature: keyof ProtectedFeatures) => {
    const isFeatureUnlocked = useAppSelector(s =>
        selectIsFeatureUnlocked(s, feature),
    )
    const isFeatureProtected = useAppSelector(selectProtectedFeatures)[feature]
    const { status } = usePin()

    if (status === 'loading') return false

    if (status === 'unset') return true

    if (!isFeatureProtected) return true

    return isFeatureUnlocked
}
