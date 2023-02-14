import { Text, TextProps, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet } from 'react-native'
import { useBtcUsdPrice } from '../../../state/hooks'
import { Sats } from '../../../types'

type UsdAmountProps = {
    amountSats?: Sats
    textProps?: TextProps
}

const DEFAULT_TEXT_PROPS = {
    medium: true,
}

const UsdAmount = ({
    amountSats,
    textProps = DEFAULT_TEXT_PROPS,
}: UsdAmountProps) => {
    const { theme } = useTheme()
    const { convertSatsToUsdString } = useBtcUsdPrice()

    let convertedAmount = '0.00'
    if (amountSats) {
        convertedAmount = convertSatsToUsdString(amountSats!)
    }

    const mergedTextProps = {
        ...DEFAULT_TEXT_PROPS,
        ...textProps,
        style: [
            styles(theme).defaultText,
            textProps.style ? textProps.style : {},
        ],
    }

    return <Text {...mergedTextProps}>{`$${convertedAmount}`}</Text>
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        defaultText: {
            color: theme.colors.darkGrey,
            textAlign: 'center',
        },
    })

export default UsdAmount
