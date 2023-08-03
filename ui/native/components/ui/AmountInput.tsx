import { Text, Theme, useTheme } from '@rneui/themed'
import React, { RefObject, useEffect, useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native'

import { useAmountInput } from '@fedi/common/hooks/amount'
import { Sats } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import InvisibleInput from './InvisibleInput'
import SvgImage from './SvgImage'

export type Props = {
    amount: Sats
    minimumAmount?: Sats | null
    maximumAmount?: Sats | null
    submitAttempts?: number
    verb?: string
    onChangeAmount?: (amount: Sats) => void
}

const AmountInput: React.FC<Props> = ({
    amount,
    minimumAmount,
    maximumAmount,
    submitAttempts,
    verb,
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
        validation,
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

    // Check validation for errors to render with suggestion for amount.
    let error: React.ReactNode | undefined
    if (validation && (!validation.onlyShowOnSubmit || submitAttempts)) {
        const handlePressSuggestion = () => {
            handleChangeSats(validation.amount.toString())
        }
        // TODO: Make only underlined suggestion pressable, <Trans /> doesn't like <Pressable /> as a component
        // TODO: Make this wiggle when submitAttempts is incremented
        error = (
            <Pressable onPress={handlePressSuggestion}>
                <Text style={styles(theme).error} caption>
                    <Trans
                        i18nKey={validation.i18nKey}
                        values={{
                            verb:
                                verb?.toLowerCase() ||
                                t('words.send').toLowerCase(),
                            amount: `${amountUtils.formatSats(
                                validation.amount,
                            )} ${t('words.sats')}`,
                        }}
                        components={{
                            suggestion: (
                                <Text
                                    style={styles(theme).errorSuggestion}
                                    caption
                                />
                            ),
                        }}
                    />
                </Text>
            </Pressable>
        )
    }

    return (
        <View style={styles(theme).container}>
            <Pressable
                style={styles(theme).inputs}
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
                <Pressable
                    style={styles(theme).symbolSwitcher}
                    onPress={() => setIsFiat(!isFiat)}>
                    <Text style={styles(theme).secondaryAmountText} medium>
                        {isFiat
                            ? `${satsValue} ${t('words.sats').toUpperCase()}`
                            : `${fiatValue} ${currency}`}
                    </Text>
                    <SvgImage
                        name="Switch"
                        color={theme.colors.grey}
                        size={20}
                    />
                </Pressable>
            </Pressable>
            {error}
        </View>
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
            paddingVertical: theme.spacing.xl,
            gap: theme.spacing.xl,
        },
        inputs: {
            alignItems: 'center',
            gap: theme.spacing.md,
        },
        secondaryAmountText: {
            color: theme.colors.darkGrey,
            textAlign: 'center',
            marginRight: theme.spacing.xs,
        },
        symbolSwitcher: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        error: {
            width: '100%',
            color: theme.colors.red,
            textAlign: 'center',
        },
        errorSuggestion: {
            color: theme.colors.red,
            textDecorationLine: 'underline',
        },
    })

export default AmountInput
