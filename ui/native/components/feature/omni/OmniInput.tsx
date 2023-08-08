import Clipboard from '@react-native-clipboard/clipboard'
import { Text, Theme, useTheme } from '@rneui/themed'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, View, StyleSheet } from 'react-native'

import { useUpdatingRef } from '@fedi/common/hooks/util'
import { formatErrorMessage } from '@fedi/common/utils/format'
import { parseUserInput } from '@fedi/common/utils/parser'

import { fedimint } from '../../../bridge'
import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import {
    AnyParsedData,
    ParsedUnknownData,
    ParserDataType,
} from '../../../types'
import SvgImage, { SvgImageName } from '../../ui/SvgImage'
import QrCodeScanner from '../scan/QrCodeScanner'
import { OmniConfirmation } from './OmniConfirmation'

export interface OmniInputAction {
    label: React.ReactNode
    icon: SvgImageName
    onPress(): void
}

interface Props<T extends ParserDataType, ExpectedData> {
    /** List of input types your component will handle. Any others will be handled internally. */
    expectedInputTypes: readonly T[]
    /** Callback for when an expected input is entered. Only types from `expectedInputTypes` will be sent. */
    onExpectedInput(data: ExpectedData): void
    /** Callback for when an unexpected input is successfully handled in-place, e.g. LNURL auth or ecash token redeem. */
    onUnexpectedSuccess(data: AnyParsedData): void
    customActions?: OmniInputAction[]
}

export function OmniInput<
    T extends ParserDataType,
    ExpectedData = Extract<AnyParsedData, { type: T }>,
>(props: Props<T, ExpectedData>): React.ReactElement {
    const propsRef = useUpdatingRef(props)
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state
    const [isParsing, setIsParsing] = useState(false)
    const [unexpectedData, setUnexpectedData] = useState<AnyParsedData>()
    const [invalidData, setInvalidData] = useState<ParsedUnknownData>()
    const isParsingRef = useUpdatingRef(isParsing)

    const { customActions, onUnexpectedSuccess } = props

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

    const handlePaste = useCallback(async () => {
        try {
            const input = await Clipboard.getString()
            await parseInput(input)
        } catch (err) {
            toast?.show(formatErrorMessage(t, err, 'errors.unknown-error'))
        }
    }, [parseInput, toast, t])

    const actions: OmniInputAction[] = useMemo(() => {
        return [
            {
                label: t('feature.omni.action-paste'),
                icon: 'Clipboard',
                onPress: handlePaste,
            },
            // {
            //     label: t('feature.omni.action-upload'),
            //     icon: 'QR',
            //     onClick: () => handleScanImageFile,
            // },
            ...(customActions || []),
        ]
    }, [customActions, handlePaste, t])

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

    const style = styles(theme)
    return (
        <View style={style.container}>
            <View style={style.scanner}>
                <QrCodeScanner
                    processing={Boolean(isParsing || unexpectedData)}
                    onQrCodeDetected={parseInput}
                />
            </View>
            <View style={style.actions}>
                {actions.map(({ label, icon, onPress }, idx) => (
                    <Pressable key={idx} onPress={onPress} style={style.action}>
                        <SvgImage name={icon} />
                        <Text bold>{label}</Text>
                    </Pressable>
                ))}
            </View>
            {confirmation}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            flexDirection: 'column',
            gap: theme.spacing.lg,
        },
        scanner: {
            flex: 1,
            width: '100%',
            borderRadius: 20,
            overflow: 'hidden',
        },
        actions: {
            width: '100%',
            flexDirection: 'column',
        },
        action: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: theme.spacing.md,
            gap: theme.spacing.lg,
        },
    })
