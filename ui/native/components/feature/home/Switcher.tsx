import { useTheme, Theme } from '@rneui/themed'
import React from 'react'
import {
    TouchableOpacity,
    StyleSheet,
    Text,
    ActivityIndicator,
} from 'react-native'

import { Row } from '../../ui/Flex'

export interface Option<T extends string> {
    label: string
    value: T
    disabled?: boolean
    loading?: boolean
}

interface Props<T extends string> {
    options: Option<T>[]
    selected: T
    onChange: (value: T) => void
}

export function Switcher<T extends string>({
    options,
    onChange,
    selected,
}: Props<T>) {
    const { theme } = useTheme()
    const style = styles(theme)

    return (
        <Row fullWidth style={style.container}>
            {options.map(option => {
                const isSelected = selected === option.value
                return (
                    <TouchableOpacity
                        key={option.value}
                        testID={`${option.value}Tab`}
                        style={[
                            style.item,
                            isSelected
                                ? style.itemSelected
                                : style.itemUnselected,
                            (option.disabled || option.loading) &&
                                style.itemDisabled,
                        ]}
                        onPress={() => onChange(option.value)}
                        disabled={option.disabled}>
                        <Text style={style.itemText}>{option.label}</Text>
                        {option.loading && <ActivityIndicator size={12} />}
                    </TouchableOpacity>
                )
            })}
        </Row>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            borderRadius: 20,
            height: 40,
            overflow: 'hidden',
            backgroundColor: theme.colors.extraLightGrey,
        },
        item: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
            borderWidth: 2,
            borderRadius: 20,
            justifyContent: 'center',
            borderColor: theme.colors.extraLightGrey,
        },
        itemSelected: {
            backgroundColor: theme.colors.white,
        },
        itemUnselected: {
            backgroundColor: theme.colors.extraLightGrey,
        },
        itemDisabled: {
            opacity: 0.5,
        },
        itemText: {
            fontSize: 14,
            color: theme.colors.night,
        },
    })
