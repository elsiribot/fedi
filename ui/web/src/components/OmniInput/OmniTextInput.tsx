import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { styled } from '../../styles'
import { Button } from '../Button'
import { Input } from '../Input'

interface Props {
    label?: React.ReactNode
    placeholder?: string
    loading?: boolean
    onSubmit(value: string): void
}

export const OmniTextInput: React.FC<Props> = ({
    label,
    placeholder,
    loading,
    onSubmit,
}) => {
    const { t } = useTranslation()
    const [value, setValue] = useState('')

    const handleSubmit = (ev: React.FormEvent) => {
        ev.preventDefault()
        onSubmit(value)
    }

    return (
        <InputForm onSubmit={handleSubmit}>
            <Input
                label={label}
                value={value}
                placeholder={placeholder}
                onChange={ev => setValue(ev.currentTarget.value)}
                disabled={loading}
                autoFocus
            />
            <Button
                width="full"
                type="submit"
                disabled={!value}
                loading={loading}>
                {t('words.confirm')}
            </Button>
        </InputForm>
    )
}

const InputForm = styled('form', {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: 8,
})
