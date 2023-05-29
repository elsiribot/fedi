import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ErrorFallbackProps } from '@fedi/common/components/ErrorBoundary'
import { formatErrorMessage } from '@fedi/common/utils/format'

import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'

export const ErrorScreen: React.FC<ErrorFallbackProps> = ({ error }) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const style = styles(theme)

    return (
        <SafeAreaView style={style.container}>
            <SvgImage name="Error" size={SvgImageSize.lg} />
            <Text h2 style={style.title}>
                {t('errors.please-force-quit-the-app')}
            </Text>
            <View style={style.messageContainer}>
                <Text style={style.message}>
                    {formatErrorMessage(t, error, 'errors.unknown-error')}
                </Text>
            </View>
        </SafeAreaView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.xl,
        },
        title: {
            marginTop: theme.spacing.xl,
            marginBottom: theme.spacing.sm,
            textAlign: 'center',
        },
        messageContainer: {
            width: '100%',
            marginTop: theme.spacing.md,
            padding: theme.spacing.md,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: `rgba(0, 0, 0, 0.12)`,
            backgroundColor: `rgba(0, 0, 0, 0.04)`,
        },
        message: {
            color: theme.colors.red,
        },
    })
