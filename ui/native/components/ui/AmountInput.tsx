import { Text, Theme, useTheme } from '@rneui/themed'
import React, { RefObject, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, TextInput } from 'react-native'

import { useAmountInput } from '@fedi/common/hooks/amount'
import { Sats } from '@fedi/common/types'

import InvisibleInput from './InvisibleInput'
import SvgImage from './SvgImage'

export type Props = {
    amount: Sats
    onChangeAmount?: (amount: Sats) => void
}

const AmountInput: React.FC<Props> = ({ amount, onChangeAmount }) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const {
        isFiat,
        setIsFiat,
        satsValue,
        fiatValue,
        handleChangeFiat,
        handleChangeSats,
        currencySymbol,
    } = useAmountInput(amount, onChangeAmount)
    const inputRef = useRef<TextInput>(null)

    return (
        <Pressable
            style={styles(theme).container}
            onPress={() => inputRef?.current?.focus()}>
            {isFiat ? (
                <InvisibleInput
                    inputRef={inputRef as RefObject<TextInput>}
                    onChangeText={handleChangeFiat}
                    value={fiatValue}
                    label={currencySymbol}
                    labelPosition={'left'}
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
