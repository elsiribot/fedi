import React from 'react'
import * as RadixRadio from '@radix-ui/react-radio-group'
import * as RadixLabel from '@radix-ui/react-label'
import { styled, theme } from '../styles'
import { Text, TextProps } from './Text'

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
        <Root onValueChange={onChange} {...props}>
            {options.map(({ value, label, disabled }) => (
                <Item key={value}>
                    <Radio
                        value={value}
                        checked={props.value === value}
                        disabled={props.disabled || disabled}>
                        <RadioIndicator />
                    </Radio>
                    <Text variant="caption" weight="medium" {...labelTextProps}>
                        {label}
                    </Text>
                </Item>
            ))}
        </Root>
    )
}

const Root = styled(RadixRadio.Root, {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
})

const Item = styled(RadixLabel.Label, {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
})

const Radio = styled(RadixRadio.Item, {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    padding: 0,
    background: theme.colors.white,
    border: `2px solid ${theme.colors.night}`,
    borderRadius: '100%',
    cursor: 'pointer',

    '&[data-disabled]': {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
})

const RadioIndicator = styled(RadixRadio.Indicator, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 10,
    height: 10,
    borderRadius: '100%',

    '&[data-state="checked"]': {
        background: theme.colors.night,
    },
})
