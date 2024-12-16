import Clipboard from '@react-native-clipboard/clipboard'
import NetInfo, { NetInfoState } from '@react-native-community/netinfo'
import { Theme, useTheme } from '@rneui/themed'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, ActivityIndicator, Pressable } from 'react-native'

import { useToast } from '@fedi/common/hooks/toast'
import { useUpdatingRef } from '@fedi/common/hooks/util'
import { selectActiveFederationId } from '@fedi/common/redux'
import {
    AnyParsedData,
    ParsedError,
    ParsedUnknownData,
    ParserDataType,
} from '@fedi/common/types'
import { parseUserInput } from '@fedi/common/utils/parser'
import { SvgImageName } from '@fedi/native/components/ui/SvgImage'

import { fedimint } from '../../../bridge'
import { useAppSelector } from '../../../state/hooks'
import { OmniConfirmation } from './OmniConfirmation'
import { OmniMemberSearch } from './OmniMemberSearch'
import { OmniQrScanner } from './OmniQrScanner'

export interface OmniInputAction {
    label: React.ReactNode
    icon: SvgImageName
    onPress: () => void | Promise<void>
}

interface Props<T extends ParserDataType, ExpectedData> {
    /** List of input types your component will handle. Any others will be handled internally. */
    expectedInputTypes: readonly T[]
    /** Callback for when an expected input is entered. Only types from `expectedInputTypes` will be sent. */
    onExpectedInput(data: ExpectedData): void
    /** Callback for when an unexpected input is successfully handled in-place, e.g. LNURL auth or ecash token redeem. */
    onUnexpectedSuccess(data: AnyParsedData): void
    /** Custom actions to add in addition to default ones */
    customActions?: OmniInputAction[]
    /** Custom label for the "Paste" action */
    pasteLabel?: string
}

export function OmniInput<
    T extends ParserDataType,
    ExpectedData = Extract<AnyParsedData, { type: T }>,
>(props: Props<T, ExpectedData>): React.ReactElement {
    const propsRef = useUpdatingRef(props)
    const { theme } = useTheme()
    const { t } = useTranslation()
    const activeFederationId = useAppSelector(selectActiveFederationId)
    const toast = useToast()
    const [showActivityIndicator, setShowActivityIndicator] = useState(false)
    const [inputMethod, setInputMethod] = useState<'scan' | 'search'>('scan')
    const [isParsing, setIsParsing] = useState(false)
    const [unexpectedData, setUnexpectedData] = useState<AnyParsedData>()
    const emptyString = ''
    const [omniError, setOmniError] = useState(emptyString)
    const omniTimeoutMs = 10000
    const omniNetworkError = 'NetworkError'
    const [invalidData, setInvalidData] = useState<
        ParsedUnknownData | ParsedError
    >()
    const isParsingRef = useUpdatingRef(isParsing)
    const {
        expectedInputTypes,
        customActions,
        onUnexpectedSuccess,
        pasteLabel,
    } = props
    const canLnurlPay = expectedInputTypes.includes(
        ParserDataType.LnurlPay as T,
    )
    const canLnurlWithdraw = expectedInputTypes.includes(
        ParserDataType.LnurlWithdraw as T,
    )
    const canMemberSearch = expectedInputTypes.includes(
        ParserDataType.FediChatUser as T,
    )

    // Centralized error handling using useEffect
    useEffect(() => {
        if (omniError !== emptyString) {
            const errorData: ParsedError = {
                type: ParserDataType.Error,
                data: {
                    title: t('feature.omni.error-network-title'),
                    message: t('feature.omni.error-network-message'),
                    goBackText: 'Retry',
                },
            }
            setInvalidData(errorData)
            setOmniError(emptyString)
        }
    }, [omniError, invalidData, unexpectedData, t])

    // TODO: Implement Room search for matrix (knocking)
    // const canRoomSearch = expectedInputTypes.includes(
    //     ParserDataType.FediChatRoom as T,
    // )

    const parseInput = useCallback(
        async (input: string) => {
            setShowActivityIndicator(true)
            if (!input || isParsingRef.current) {
                const errorData: ParsedError = {
                    type: ParserDataType.Error,
                    data: {
                        title: t('feature.omni.error-parsing-title'),
                        message: t('feature.omni.error-parsing-message'),
                        goBackText: 'Retry',
                    },
                }
                setInvalidData(errorData) // Treat this as invalid data
                setIsParsing(false)
                setShowActivityIndicator(false)
                return
            }
            setIsParsing(true)
            const handleWithNetworkCheck = async (
                callback: () => void,
                errorMessage: string,
            ) => {
                const state: NetInfoState = await NetInfo.fetch()
                !state.isConnected ? setOmniError(errorMessage) : callback()
            }

            // Start timeout logic, to show network error if we can't parse within 'omniTimeoutMs'
            const timeoutId = setTimeout(() => {
                setOmniError(omniNetworkError)
                setIsParsing(false)
                setShowActivityIndicator(false)
            }, omniTimeoutMs)

            try {
                const parsedData = await parseUserInput(
                    input,
                    fedimint,
                    t,
                    activeFederationId,
                )
                const expectedTypes = propsRef.current
                    .expectedInputTypes as readonly string[]

                if (expectedTypes.includes(parsedData.type)) {
                    propsRef.current.onExpectedInput(parsedData as ExpectedData)
                    setIsParsing(false)
                } else if (parsedData.type === ParserDataType.Unknown) {
                    await handleWithNetworkCheck(
                        () => setInvalidData(parsedData),
                        t('feature.omni.error-network-message'),
                    )
                } else {
                    await handleWithNetworkCheck(
                        () => setUnexpectedData(parsedData),
                        t('feature.omni.error-network-message'),
                    )
                }
            } catch (err) {
                setOmniError(t('feature.omni.error-network-message'))
            } finally {
                clearTimeout(timeoutId)
                setShowActivityIndicator(false)
            }
        },
        [propsRef, isParsingRef, t, activeFederationId],
    )

    const handlePaste = useCallback(async () => {
        try {
            setShowActivityIndicator(true)
            const input = await Clipboard.getString()
            await parseInput(input)
        } catch (err) {
            toast.error(t, err)
        } finally {
            setShowActivityIndicator(false)
        }
    }, [parseInput, toast, t])

    const actions: OmniInputAction[] = useMemo(() => {
        const contextualActions: OmniInputAction[] = []
        if (inputMethod !== 'search' && canMemberSearch) {
            contextualActions.push({
                label: t(
                    canLnurlPay
                        ? 'feature.omni.action-enter-username-or-ln'
                        : 'feature.omni.action-enter-username',
                ),
                icon: 'Keyboard',
                onPress: () => setInputMethod('search'),
            })
        }
        if (inputMethod !== 'scan') {
            contextualActions.push({
                label: t('feature.omni.action-scan'),
                icon: 'Scan',
                onPress: () => setInputMethod('scan'),
            })
        }

        return [
            ...contextualActions,
            {
                label: pasteLabel || t('feature.omni.action-paste'),
                icon: 'Clipboard',
                onPress: handlePaste,
            },
            ...(customActions || []),
        ]
    }, [
        customActions,
        inputMethod,
        canMemberSearch,
        canLnurlPay,
        pasteLabel,
        handlePaste,
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
                    setIsParsing(false)
                }}
                onSuccess={onUnexpectedSuccess}
            />
        )
    }

    const style = styles(theme)
    return (
        <View style={style.container}>
            {showActivityIndicator && (
                <Pressable
                    onPress={() => setShowActivityIndicator(false)}
                    style={style.overlay}>
                    <ActivityIndicator
                        size="large"
                        color={theme.colors.primary}
                    />
                </Pressable>
            )}
            {inputMethod === 'scan' && (
                <OmniQrScanner
                    onInput={parseInput}
                    actions={actions}
                    isProcessing={Boolean(isParsing || unexpectedData)}
                />
            )}
            {inputMethod === 'search' && (
                <OmniMemberSearch
                    onInput={parseInput}
                    actions={actions}
                    canLnurlPay={canLnurlPay}
                    canLnurlWithdraw={canLnurlWithdraw}
                />
            )}
            {confirmation}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            width: '100%',
            flexDirection: 'column',
            gap: theme.spacing.lg,
        },
        overlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent background
            zIndex: 2,
        },
    })
