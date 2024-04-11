import { useEffect, useRef, useState } from 'react'
import * as Keychain from 'react-native-keychain'
import { z } from 'zod'

import { selectDeviceId } from '../redux'
import { useCommonSelector } from './redux'

export function usePin() {
    const [hasSetPin, setHasSetPin] = useState(false)
    // set to return true by default in case the user hasn't set a pin
    const checkRef = useRef<((digits: Array<number>) => boolean) | null>(null)
    const deviceId = useCommonSelector(selectDeviceId)

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

            if (
                pin &&
                pin.username === deviceId &&
                pin.service === 'pin' &&
                typeof pin.password === 'string'
            ) {
                setHasSetPin(true)
                checkRef.current = (digits: Array<number>) => {
                    return digits.join('') === pin.password
                }
            }
        }

        loadPinCheck()
    }, [deviceId])

    return { check: checkRef.current, set, hasSetPin }
}
