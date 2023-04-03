import React from 'react'
import * as RadixCheckbox from '@radix-ui/react-checkbox'
import { Label } from '@radix-ui/react-label'
import { Text, TextProps } from '../Text'
import styles from './style.module.scss'

export interface CheckboxProps {
    checked: boolean
    defaultChecked?: boolean
    disabled?: boolean
    label?: React.ReactNode
    labelTextProps?: TextProps
    onChange?: (checked: boolean) => void
}

export const Checkbox: React.FC<CheckboxProps> = ({
    label,
    onChange,
    labelTextProps,
    ...props
}) => {
    return (
        <Label className={styles.container}>
            <RadixCheckbox.Root
                {...props}
                onCheckedChange={onChange}
                className={styles.checkbox}>
                <RadixCheckbox.Indicator className={styles.indicator} />
            </RadixCheckbox.Root>
            {label && (
                <Text
                    variant="caption"
                    weight="medium"
                    className={styles.label}
                    {...labelTextProps}>
                    {label}
                </Text>
            )}
        </Label>
    )
}
