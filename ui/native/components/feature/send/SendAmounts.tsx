import { Text, Theme, useTheme } from '@rneui/themed'
import { StyleSheet, View } from 'react-native'

import { hexToRgba } from '@fedi/common/utils/color'

export type Props = {
    balanceDisplay: string
    formattedPrimaryAmount: string
    formattedSecondaryAmount: string
}

const SendAmounts: React.FC<Props> = ({
    balanceDisplay,
    formattedPrimaryAmount,
    formattedSecondaryAmount,
}) => {
    const { theme } = useTheme()

    const style = styles(theme)
    return (
        <>
            <Text
                caption
                style={style.balance}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {`${balanceDisplay} `}
            </Text>
            <View style={style.amountContainer}>
                <Text h1 numberOfLines={1}>
                    {formattedPrimaryAmount}
                </Text>
                <Text
                    style={style.secondaryAmountText}
                    medium
                    numberOfLines={1}>
                    {formattedSecondaryAmount}
                </Text>
            </View>
        </>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        amountContainer: {
            marginTop: 'auto',
        },
        balance: {
            color: hexToRgba(theme.colors.primary, 0.6),
            textAlign: 'center',
        },
        secondaryAmountText: {
            color: theme.colors.darkGrey,
            textAlign: 'center',
            marginRight: theme.spacing.xs,
            marginTop: theme.spacing.xs,
        },
    })

export default SendAmounts
