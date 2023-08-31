import { Button, ButtonProps, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Insets, StyleSheet, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { selectActiveFederation } from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { hexToRgba } from '@fedi/common/utils/color'

import { useAppSelector } from '../../state/hooks'
import AmountInput, { Props as AmountInputProps } from './AmountInput'
import KeyboardAwareWrapper from './KeyboardAwareWrapper'

interface Props extends AmountInputProps {
    showBalance?: boolean
    description?: string
    buttons: ButtonProps[]
}

export const AmountScreen: React.FC<Props> = ({
    showBalance,
    buttons,
    ...amountInputProps
}) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { height } = useWindowDimensions()
    const insets = useSafeAreaInsets()
    const balance = useAppSelector(selectActiveFederation)?.balance

    const style = styles(theme, insets, height)
    return (
        <KeyboardAwareWrapper>
            <View style={style.container}>
                {showBalance && typeof balance === 'number' && (
                    <Text caption style={style.balance}>
                        {`${t('words.balance')}: `}
                        {`${amountUtils.formatNumber(
                            amountUtils.msatToSat(balance),
                        )} `}
                        {`${t('words.sats').toUpperCase()}`}
                    </Text>
                )}
                <AmountInput {...amountInputProps} />
                <View style={style.buttonContainer}>
                    {buttons.map((button, index) => (
                        <Button
                            fullWidth
                            key={`btn-${index}`}
                            style={[style.button, button.style]}
                            {...button}
                        />
                    ))}
                </View>
            </View>
        </KeyboardAwareWrapper>
    )
}

const styles = (theme: Theme, insets: Insets, height: number) =>
    StyleSheet.create({
        container: {
            flex: 1,
            paddingHorizontal: theme.spacing.xl,
            paddingBottom: Math.max(theme.spacing.xl, insets.bottom || 0),
            width: '100%',
            gap: theme.spacing.xl,
        },
        balance: {
            paddingTop: height >= 500 ? theme.spacing.xl : theme.spacing.sm,
            color: hexToRgba(theme.colors.primary, 0.6),
            textAlign: 'center',
        },
        buttonContainer: {
            width: '100%',
            flexDirection: 'row',
            gap: theme.spacing.xl,
        },
        button: {
            // flex: 1,
        },
    })
