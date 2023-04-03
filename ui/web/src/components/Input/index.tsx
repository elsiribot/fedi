import React, { useCallback, useState } from 'react'
import { Label } from '@radix-ui/react-label'
import styles from './style.module.scss'
import { Text } from '../Text'
import clsx from 'clsx'

interface CustomProps {
    value: string
    label?: React.ReactNode
    placeholder?: string
    disabled?: boolean
    endAdornment?: React.ReactNode
}

type Props = CustomProps &
    Omit<
        React.ButtonHTMLAttributes<HTMLInputElement>,
        keyof CustomProps | 'className'
    >

export const Input: React.FC<Props> = ({
    label,
    endAdornment,
    onFocus,
    onBlur,
    ...inputProps
}) => {
    const [hasFocus, setHasFocus] = useState(false)

    const handleFocus = useCallback(
        (ev: React.FocusEvent<HTMLInputElement>) => {
            setHasFocus(true)
            if (onFocus) onFocus(ev)
        },
        [onFocus],
    )

    const handleBlur = useCallback(
        (ev: React.FocusEvent<HTMLInputElement>) => {
            setHasFocus(false)
            if (onBlur) onBlur(ev)
        },
        [onBlur],
    )

    return (
        <Label className={styles.container}>
            {label && (
                <Text variant="small" className={styles.label}>
                    {label}
                </Text>
            )}
            <div
                className={clsx(
                    styles.inputWrap,
                    hasFocus && styles.isFocused,
                    inputProps.disabled && styles.isDisabled,
                )}>
                <input
                    className={styles.input}
                    {...inputProps}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                />
                {endAdornment && (
                    <div className={styles.endAdornment}>{endAdornment}</div>
                )}
            </div>
        </Label>
    )
}
