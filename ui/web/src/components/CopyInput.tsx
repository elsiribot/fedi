import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import CopyIcon from '@fedi/common/assets/svgs/copy.svg'

import { useToast } from '../hooks'
import { styled } from '../styles'
import { Icon } from './Icon'
import { Input } from './Input'
import { Text } from './Text'

interface Props {
    value: string
    label?: React.ReactNode
    onCopyMessage?: string
}

export const CopyInput: React.FC<Props> = ({ value, label, onCopyMessage }) => {
    const { t } = useTranslation()
    const { showToast, showErrorToast } = useToast()

    const handleCopy = useCallback(async () => {
        try {
            navigator.clipboard.writeText(value)
            if (onCopyMessage) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                showToast({ content: t(onCopyMessage as any) })
            }
        } catch (err) {
            showErrorToast(err, 'errors.unknown-error')
        }
    }, [value, showToast, onCopyMessage, t, showErrorToast])

    return (
        <Input
            value={value}
            label={label}
            textOverflow="ellipsis"
            adornment={
                <CopyButton onClick={handleCopy}>
                    <Icon icon={CopyIcon} />
                    <Text variant="small" weight="medium">
                        {t('words.copy')}
                    </Text>
                </CopyButton>
            }
            readOnly
        />
    )
}

const CopyButton = styled('button', {
    display: 'flex',
    alignItems: 'center',
    paddingRight: 12,
    gap: 4,

    '& svg': {
        flexShrink: 0,
    },
})
