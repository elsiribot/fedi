import React from 'react'
import * as RadixCheckbox from '@radix-ui/react-checkbox'
import * as RadixLabel from '@radix-ui/react-label'
import { styled, theme } from '../styles'
import { Text, TextProps } from './Text'

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
        <Root>
            <CheckboxRoot {...props} onCheckedChange={onChange}>
                <CheckboxIndicator />
            </CheckboxRoot>
            {label && (
                <Text variant="caption" weight="medium" {...labelTextProps}>
                    {label}
                </Text>
            )}
        </Root>
    )
}

const Root = styled(RadixLabel.Label, {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
})

const CheckboxRoot = styled(RadixCheckbox.Root, {
    position: 'relative',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: 22,
    height: 22,
    padding: 0,
    background: theme.colors.white,
    border: `2px solid ${theme.colors.night}`,
    borderRadius: 4,
    cursor: 'pointer',

    '&[data-state="checked"]': {
        background: theme.colors.night,
    },

    '&[data-disabled], &:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
})

const CheckboxIndicator = styled(RadixCheckbox.Indicator, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: theme.colors.white,

    '&[data-state="checked"]:after': {
        content: '✓',
    },
})
