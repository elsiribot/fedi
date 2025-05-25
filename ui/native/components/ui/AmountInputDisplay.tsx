import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useCommonSelector } from '@fedi/common/hooks/redux'
import {
    selectBtcExchangeRate,
    selectCurrency,
    selectCurrencyLocale,
    selectAmountInputType,
} from '@fedi/common/redux'
import { Sats } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import Flex from './Flex'

export interface AmountInputDisplayProps {
    amount: Sats
    showFiat?: boolean
}

const AmountInputDisplay: React.FC<AmountInputDisplayProps> = ({
    amount,
    showFiat,
}) => {
    const { theme } = useTheme()
    const { t } = useTranslation()

    const btcToFiatRate = useCommonSelector(selectBtcExchangeRate)
    const currency = useCommonSelector(selectCurrency)
    const currencyLocale = useCommonSelector(selectCurrencyLocale)
    const lastInputType = useCommonSelector(selectAmountInputType)

    const isFiat = showFiat ?? lastInputType !== 'sats'

    const { fiatString, satsString } = useMemo(() => {
        const satsFmt = amountUtils.formatSats(amount)
        const fiatRaw = amountUtils.satToBtc(amount) * btcToFiatRate
        const decimals = amountUtils.getCurrencyDecimals(currency, {
            locale: currencyLocale,
        })
        const fiatFmt = amountUtils.formatFiat(fiatRaw, currency, {
            locale: currencyLocale,
            symbolPosition: 'none',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        })
        return { fiatString: fiatFmt, satsString: satsFmt }
    }, [amount, btcToFiatRate, currency, currencyLocale])

    const primary = isFiat ? fiatString : satsString
    const secondary = isFiat
        ? `${satsString} ${t('words.sats').toUpperCase()}`
        : `${fiatString} ${currency}`

    const label = isFiat ? currency : t('words.sats').toUpperCase()

    return (
        <View style={styles(theme).wrapper}>
            <Flex
                row
                align="end"
                justify="center"
                fullWidth
                style={styles(theme).primaryRow}>
                <Text h1 style={styles(theme).primaryText} adjustsFontSizeToFit>
                    {primary}
                </Text>
                <Text h2 numberOfLines={1} h2Style={styles(theme).labelText}>
                    {label}
                </Text>
            </Flex>

            <Text caption style={styles(theme).secondaryText} numberOfLines={1}>
                {secondary}
            </Text>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        wrapper: {
            width: '100%',
            paddingHorizontal: theme.spacing.lg,
        },
        primaryRow: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'center',
            width: '100%',
        },
        primaryText: {
            textAlign: 'center',
        },
        labelText: {
            marginLeft: theme.spacing.sm,
            marginBottom: 3,
            fontSize: 20,
        },
        secondaryText: {
            color: theme.colors.darkGrey,
            textAlign: 'center',
            marginTop: theme.spacing.xs,
        },
    })

export default AmountInputDisplay
