import { styled } from '@stitches/react'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ClipboardIcon from '@fedi/common/assets/svgs/clipboard.svg'
import KeyboardIcon from '@fedi/common/assets/svgs/keyboard.svg'
import QRIcon from '@fedi/common/assets/svgs/qr.svg'
import ScanIcon from '@fedi/common/assets/svgs/scan.svg'
import { useUpdatingRef } from '@fedi/common/hooks/util'
import {
    AnyParsedData,
    ParsedUnknownData,
    ParserDataType,
} from '@fedi/common/types'
import { parseUserInput } from '@fedi/common/utils/parser'

import { useToast } from '../../hooks'
import { fedimint } from '../../lib/bridge'
import { Button } from '../Button'
import { Icon } from '../Icon'
import { Input } from '../Input'
import { QRScanner, ScanResult } from '../QRScanner'
import { Text } from '../Text'
import { OmniConfirmation } from './OmniConfirmation'

interface OmniInputAction {
    label: React.ReactNode
    icon: React.FunctionComponent<React.SVGAttributes<SVGElement>>
    onClick(): void
}

interface Props<T extends ParserDataType, ExpectedData> {
    /** List of input types your component will handle. Any others will be handled internally. */
    expectedInputTypes: readonly T[]
    /** Callback for when an expected input is entered. Only types from `expectedInputTypes` will be sent. */
    onExpectedInput(data: ExpectedData): void
    /** Callback for when an unexpected input is successfully handled in-place, e.g. LNURL auth or ecash token redeem. */
    onUnexpectedSuccess(data: AnyParsedData): void
    inputLabel?: React.ReactNode
    inputPlaceholder?: string
    pasteLabel?: React.ReactNode
    customActions?: OmniInputAction[]
}

export function OmniInput<
    T extends ParserDataType,
    ExpectedData = Extract<AnyParsedData, { type: T }>,
>(props: Props<T, ExpectedData>): React.ReactElement {
    const propsRef = useUpdatingRef(props)
    const { t } = useTranslation()
    const toast = useToast()
    const [isScanning, setIsScanning] = useState(false)
    const [isParsing, setIsParsing] = useState(false)
    const [unexpectedData, setUnexpectedData] = useState<AnyParsedData>()
    const [invalidData, setInvalidData] = useState<ParsedUnknownData>()
    const [value, setValue] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const isParsingRef = useUpdatingRef(isParsing)

    const { customActions, inputPlaceholder, onUnexpectedSuccess } = props
    const inputLabel = props.inputLabel || 'Input data'
    const pasteLabel = props.pasteLabel || t('feature.omni.action-paste')

    const parseInput = useCallback(
        async (input: string) => {
            if (!input || isParsingRef.current) return
            setIsParsing(true)
            const parsedData = await parseUserInput(input, fedimint, t)
            setIsParsing(false)

            const expectedTypes = propsRef.current
                .expectedInputTypes as readonly string[]
            if (expectedTypes.includes(parsedData.type)) {
                propsRef.current.onExpectedInput(parsedData as ExpectedData)
            } else if (parsedData.type === ParserDataType.Unknown) {
                setInvalidData(parsedData)
            } else {
                setUnexpectedData(parsedData)
            }
        },
        [propsRef, isParsingRef, t],
    )

    const handleScan = useCallback(
        (result: ScanResult) => {
            parseInput(result.data)
        },
        [parseInput],
    )

    const handleSubmit = useCallback(
        (ev: React.FormEvent) => {
            ev.preventDefault()
            parseInput(value)
        },
        [parseInput, value],
    )

    const handlePaste = useCallback(async () => {
        try {
            const input = await navigator.clipboard.readText()
            await parseInput(input)
        } catch (err) {
            toast.showErrorToast(err, 'errors.unknown-error')
        }
    }, [parseInput, toast])

    // Perform a QrScanner scan from an image file, rather than from the QRScanner component
    const handleImageFile = useCallback(
        async (ev: React.ChangeEvent<HTMLInputElement>) => {
            const image = ev.currentTarget.files?.[0]
            if (!image) return
            ev.currentTarget.value = ''
            try {
                const QrScanner = (await import('qr-scanner')).default
                const result = await QrScanner.scanImage(image, {
                    returnDetailedScanResult: true,
                })
                handleScan(result)
            } catch (err) {
                toast.showErrorToast(err, 'errors.unknown-error')
            }
            // Reset the input so they can re-select the same file if they wish
        },
        [toast, handleScan],
    )

    const actions = useMemo(() => {
        return [
            isScanning
                ? {
                      label: inputLabel,
                      icon: KeyboardIcon,
                      onClick: () => setIsScanning(false),
                  }
                : {
                      label: t('feature.omni.action-scan'),
                      icon: ScanIcon,
                      onClick: () => setIsScanning(true),
                  },
            {
                label: pasteLabel,
                icon: ClipboardIcon,
                onClick: handlePaste,
            },
            {
                label: t('feature.omni.action-upload'),
                icon: QRIcon,
                onClick: () => fileInputRef.current?.click(),
            },
            ...(customActions || []),
        ]
    }, [
        customActions,
        isScanning,
        inputLabel,
        pasteLabel,
        handlePaste,
        fileInputRef,
        t,
    ])

    let confirmation: React.ReactNode | undefined
    if (invalidData || unexpectedData) {
        confirmation = (
            <OmniConfirmation
                parsedData={(invalidData || unexpectedData) as AnyParsedData}
                onGoBack={() => {
                    setInvalidData(undefined)
                    setUnexpectedData(undefined)
                }}
                onSuccess={onUnexpectedSuccess}
            />
        )
    }

    return (
        <Container>
            <Main>
                {isScanning ? (
                    <QRScanner onScan={handleScan} processing={isParsing} />
                ) : (
                    <>
                        <InputForm onSubmit={handleSubmit}>
                            <Input
                                label={inputLabel || 'Input data'}
                                value={value}
                                placeholder={inputPlaceholder}
                                onChange={ev =>
                                    setValue(ev.currentTarget.value)
                                }
                                disabled={isParsing}
                                autoFocus
                            />
                            <Button
                                width="full"
                                type="submit"
                                disabled={!value}
                                loading={isParsing}>
                                {t('words.confirm')}
                            </Button>
                        </InputForm>
                    </>
                )}
            </Main>
            <Actions>
                {actions.map(({ label, icon, onClick }, idx) => (
                    <Action key={idx} onClick={onClick}>
                        <Icon size="sm" icon={icon} />
                        <Text weight="bold">{label}</Text>
                    </Action>
                ))}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFile}
                    style={{ display: 'none' }}
                />
            </Actions>
            {confirmation}
        </Container>
    )
}

const Container = styled('div', {
    position: 'relative',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
})

const Main = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 16,
})

const InputForm = styled('form', {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: 8,
})

const Actions = styled('div', {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
})

const Action = styled('button', {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    height: 40,
    padding: '0 8px',
    borderRadius: 8,

    '&:hover': {
        background: 'rgba(0, 0, 0, 0.04)',
    },
})
