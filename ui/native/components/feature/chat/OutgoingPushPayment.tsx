import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type OutgoingPushPaymentProps = {
    text: string
}

const OutgoingPushPayment: React.FC<OutgoingPushPaymentProps> = ({
    text,
}: OutgoingPushPaymentProps) => {
    const { theme } = useTheme()
    const { t } = useTranslation()

    return (
        <View style={styles(theme).container}>
            <Text caption medium style={styles(theme).messageText}>
                {text}
            </Text>
            <View style={styles(theme).actionsContainer}>
                <View style={styles(theme).statusContainer}>
                    <SvgImage
                        name="Check"
                        size={SvgImageSize.xs}
                        color={theme.colors.secondary}
                    />
                    <Text medium caption style={styles(theme).statusText}>
                        {t('words.paid')}
                    </Text>
                </View>
            </View>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'flex-start',
        },
        actionsContainer: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            width: '100%',
            paddingVertical: theme.spacing.xs,
        },
        statusContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        statusText: {
            color: theme.colors.secondary,
            marginLeft: theme.spacing.xs,
        },
        buttonContainer: {
            flex: 1,
            maxWidth: '50%',
        },
        messageText: {
            color: theme.colors.secondary,
            paddingBottom: theme.spacing.sm,
        },
    })

export default OutgoingPushPayment
