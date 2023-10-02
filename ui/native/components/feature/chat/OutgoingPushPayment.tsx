import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { ChatMessage, ChatPaymentStatus } from '../../../types'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'
import { SvgImageName } from '../../ui/SvgImage'

type OutgoingPushPaymentProps = {
    message: ChatMessage
    text: string
}

const OutgoingPushPayment: React.FC<OutgoingPushPaymentProps> = ({
    message,
    text,
}: OutgoingPushPaymentProps) => {
    const { theme } = useTheme()
    const { t } = useTranslation()

    let iconName: SvgImageName | undefined
    let statusText: string
    if (message.payment?.status === ChatPaymentStatus.paid) {
        iconName = 'Check'
        statusText = t('words.paid')
    } else {
        statusText = t('words.pending')
    }

    return (
        <View style={styles(theme).container}>
            <Text caption medium style={styles(theme).messageText}>
                {text}
            </Text>
            <View style={styles(theme).actionsContainer}>
                <View style={styles(theme).statusContainer}>
                    {iconName && (
                        <SvgImage
                            name={iconName}
                            size={SvgImageSize.xs}
                            color={theme.colors.secondary}
                        />
                    )}
                    <Text medium caption style={styles(theme).statusText}>
                        {statusText}
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
