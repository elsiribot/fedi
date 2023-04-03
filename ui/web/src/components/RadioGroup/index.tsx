import React from 'react'
import clsx from 'clsx'
import * as RadixRadio from '@radix-ui/react-radio-group'
import { Label } from '@radix-ui/react-label'
import { Text, TextProps } from '../Text'
import styles from './style.module.scss'

interface RadioOption<T extends string> {
    label: React.ReactNode
    value: T
    disabled?: boolean
}

interface Props<T extends string> {
    options: RadioOption<T>[]
    value: T | undefined
    disabled?: boolean
    labelTextProps?: TextProps
    onChange(value: T): void
}

export function RadioGroup<T extends string>({
    options,
    onChange,
    labelTextProps,
    ...props
}: Props<T>): React.ReactElement {
    return (
        <RadixRadio.Root
            className={styles.root}
            onValueChange={onChange}
            {...props}>
            {options.map(({ value, label, disabled }) => (
                <Label key={value} className={styles.item}>
                    <RadixRadio.Item
                        className={styles.radio}
                        value={value}
                        checked={props.value === value}
                        disabled={props.disabled || disabled}>
                        <RadixRadio.Indicator className={styles.indicator} />
                    </RadixRadio.Item>
                    <Text
                        variant="caption"
                        weight="medium"
                        {...labelTextProps}
                        className={clsx(
                            labelTextProps?.className,
                            styles.label,
                        )}>
                        {label}
                    </Text>
                </Label>
            ))}
        </RadixRadio.Root>
    )
}
