import { Button, ButtonProps, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

import { useBalanceDisplay } from '@fedi/common/hooks/amount'
import { selectActiveFederation } from '@fedi/common/redux'
import { hexToRgba } from '@fedi/common/utils/color'

import { useAppSelector } from '../../state/hooks'
import AmountInputDisplay, {
    AmountInputDisplayProps,
} from './AmountInputDisplay'
import Flex from './Flex'
import KeyboardAwareWrapper from './KeyboardAwareWrapper'
import NotesInput from './NotesInput'
import { SafeAreaContainer } from './SafeArea'

interface Props extends AmountInputDisplayProps {
    showBalance?: boolean
    subHeader?: React.ReactNode | null
    subContent?: React.ReactNode | null
    buttons?: ButtonProps[]
    isIndependent?: boolean
    notes?: string
    notesLabel?: string
    notesOptional?: boolean
    setNotes?: (notes: string) => void
}

export const AmountDisplayScreen: React.FC<Props> = ({
    showBalance,
    subHeader = null,
    subContent = null,
    buttons = [],
    isIndependent = true,
    notes = '',
    notesLabel,
    setNotes,
    notesOptional = true,
    ...amountInputDisplayProps
}) => {
    const { t } = useTranslation()
    const { theme } = useTheme()

    const activeFederation = useAppSelector(selectActiveFederation)
    const balance = activeFederation?.hasWallet
        ? activeFederation.balance
        : undefined
    const balanceDisplay = useBalanceDisplay(t)

    const styles = makeStyles(theme)

    return (
        <KeyboardAwareWrapper behavior="position">
            <SafeAreaContainer
                style={styles.container}
                edges={isIndependent ? 'notop' : 'none'}>
                <Flex grow style={styles.contentArea}>
                    {(subHeader || showBalance) && (
                        <Flex gap="sm" style={styles.headerSection}>
                            {subHeader}
                            {showBalance && typeof balance === 'number' && (
                                <Text
                                    caption
                                    style={styles.balance}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit>
                                    {balanceDisplay}
                                </Text>
                            )}
                        </Flex>
                    )}

                    <Flex grow center style={styles.amountSection}>
                        <AmountInputDisplay {...amountInputDisplayProps} />

                        {setNotes && (
                            <Flex style={styles.notesSection}>
                                <NotesInput
                                    label={notesLabel}
                                    notes={notes}
                                    setNotes={setNotes}
                                    isOptional={notesOptional}
                                />
                            </Flex>
                        )}
                    </Flex>

                    {subContent && (
                        <Flex style={styles.subContentSection}>
                            {subContent}
                        </Flex>
                    )}
                </Flex>

                {buttons.length > 0 && (
                    <Flex row fullWidth style={styles.buttonSection}>
                        {buttons.map((button, index) => (
                            <Button
                                key={`btn-${index}`}
                                containerStyle={styles.buttonContainer}
                                {...button}
                            />
                        ))}
                    </Flex>
                )}
            </SafeAreaContainer>
        </KeyboardAwareWrapper>
    )
}

const makeStyles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
            marginBottom: theme.spacing.xl,
        },

        contentArea: {
            paddingHorizontal: theme.spacing.lg,
        },

        headerSection: {
            paddingTop: theme.spacing.xl,
            paddingBottom: theme.spacing.lg,
        },

        balance: {
            color: hexToRgba(theme.colors.primary, 0.6),
            textAlign: 'center',
        },

        amountSection: {
            paddingVertical: theme.spacing.xl,
        },

        notesSection: {
            paddingTop: theme.spacing.lg,
            paddingHorizontal: theme.spacing.md,
            width: '100%',
        },

        subContentSection: {
            paddingBottom: theme.spacing.lg,
        },

        buttonSection: {
            paddingTop: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
        },

        buttonContainer: {
            flex: 1,
        },
    })
