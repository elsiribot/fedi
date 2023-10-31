import { Button, ButtonProps, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Insets, StyleSheet, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useBalanceDisplay } from '@fedi/common/hooks/amount'
import { hexToRgba } from '@fedi/common/utils/color'

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
    const balanceDisplay = useBalanceDisplay(t)

    const style = styles(theme, insets, height)

    return (
        <KeyboardAwareWrapper>
            <View style={style.container}>
                {showBalance && (
                    <Text caption style={style.balance}>
                        {balanceDisplay}
                    </Text>
                )}
                <AmountInput {...amountInputProps} />
                <View style={style.buttonGroup}>
                    {buttons.map((button, index) => (
                        <Button
                            key={`btn-${index}`}
                            containerStyle={[
                                style.buttonContainer,
                                button.containerStyle,
                            ]}
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
        buttonGroup: {
            width: '100%',
            alignSelf: 'center',
            flexDirection: 'row',
            gap: 20,
        },
        buttonContainer: {
            flex: 1,
        },
    })
