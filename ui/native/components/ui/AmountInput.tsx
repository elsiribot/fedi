import { Text, Theme, useTheme } from '@rneui/themed'
import React, { RefObject, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, Pressable, StyleSheet, TextInput } from 'react-native'

import { useAmountInput } from '@fedi/common/hooks/amount'
import { Sats } from '@fedi/common/types'

import InvisibleInput from './InvisibleInput'
import SvgImage from './SvgImage'

export type Props = {
    amount: Sats
    minimumAmount?: Sats | null
    maximumAmount?: Sats | null
    onChangeAmount?: (amount: Sats) => void
}

const AmountInput: React.FC<Props> = ({
    amount,
    minimumAmount,
    maximumAmount,
    onChangeAmount,
}) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const {
        isFiat,
        setIsFiat,
        satsValue,
        fiatValue,
        handleChangeFiat,
        handleChangeSats,
        currency,
        currencySymbol,
    } = useAmountInput(amount, onChangeAmount, minimumAmount, maximumAmount)
    const inputRef = useRef<TextInput>(null)

    // For some reason the TextInput inside InvisibleInput does not
    // automatically blur the input when the keyboard is dismissed
    // which causes the .focus() event to have no effect so here we
    // force the blur to make sure .isFocused() returns false
    useEffect(() => {
        const keyboardHiddenListener = Keyboard.addListener(
            'keyboardDidHide',
            () => inputRef.current?.blur(),
        )
        return () => {
            keyboardHiddenListener.remove()
        }
    }, [])

    useEffect(() => {
        setInterval(() => {
            console.debug(
                'inputRef.current?.isFocused()',
                inputRef.current?.isFocused(),
            )
        }, 1000)
    }, [])

    return (
        <Pressable
            style={styles(theme).container}
            onPress={() => {
                console.debug('inputRef?.current?.focus()')
                inputRef?.current?.focus()
            }}>
            {isFiat ? (
                <InvisibleInput
                    inputRef={inputRef as RefObject<TextInput>}
                    onChangeText={handleChangeFiat}
                    value={fiatValue}
                    label={currency}
                />
            ) : (
                <InvisibleInput
                    inputRef={inputRef as RefObject<TextInput>}
                    onChangeText={handleChangeSats}
                    value={satsValue}
                    label={t('words.sats').toUpperCase()}
                />
            )}
            <Pressable style={styles(theme).symbolSwitcher}>
                <Text style={styles(theme).secondaryAmountText}>
                    {isFiat
                        ? `${satsValue} ${t('words.sats').toUpperCase()}`
                        : `${currencySymbol} ${fiatValue}`}
                </Text>
                <Pressable onPress={() => setIsFiat(!isFiat)}>
                    <SvgImage name="Switch" color={theme.colors.grey} />
                </Pressable>
            </Pressable>
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
            marginTop: 'auto',
            marginHorizontal: theme.spacing.xl,
            // This creates a small buffer zone to block Keyboard.dismiss
            // events from parent components
            padding: theme.spacing.xl,
        },
        secondaryAmountText: {
            color: theme.colors.darkGrey,
            textAlign: 'center',
            marginHorizontal: theme.spacing.sm,
        },
        symbolSwitcher: {
            flexDirection: 'row',
            alignItems: 'center',
        },
    })

export default AmountInput
