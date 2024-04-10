import { Button, Text, Theme, useTheme } from '@rneui/themed'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, StyleSheet, View } from 'react-native'

import SvgImage from '../../ui/SvgImage'

export type Props = {
    onPressFees: () => void
    onSend: () => void
    formattedTotalFee: string
    receiverText: string
    senderText: string
    isLoading: boolean
}

const SendPreviewDetails: React.FC<Props> = ({
    onPressFees,
    onSend,
    formattedTotalFee,
    receiverText,
    senderText,
    isLoading,
}) => {
    const { theme } = useTheme()
    const [showDetails, setShowDetails] = useState<boolean>(false)
    const { t } = useTranslation()
    const handleConfirm = useCallback(() => {
        Alert.alert(
            t('phrases.please-confirm'),
            t('feature.send.offline-send-warning'),
            [
                {
                    text: t('phrases.go-back'),
                },
                {
                    text: t('words.continue'),
                    onPress: onSend,
                },
            ],
        )
    }, [onSend, t])

    const style = styles(theme)
    return (
        <View style={style.detailsGroup}>
            <View
                style={[
                    showDetails
                        ? style.detailsContainer
                        : style.collapsedContainer,
                ]}>
                <View style={[style.detailItem, style.bottomBorder]}>
                    <Text caption bold style={style.darkGrey}>{`${t(
                        'feature.send.send-to',
                    )}`}</Text>
                    <Text caption style={style.darkGrey}>
                        {receiverText}
                    </Text>
                </View>
                <Pressable
                    style={[style.detailItem, style.bottomBorder]}
                    onPress={onPressFees}>
                    <Text
                        caption
                        bold
                        style={[style.darkGrey, style.detailItemTitle]}>{`${t(
                        'words.fees',
                    )}`}</Text>
                    <Text
                        caption
                        style={style.darkGrey}>{`${formattedTotalFee}`}</Text>
                    <SvgImage name="Info" size={16} color={theme.colors.grey} />
                </Pressable>
                <View style={[style.detailItem]}>
                    <Text caption bold style={style.darkGrey}>{`${t(
                        'feature.send.send-from',
                    )}`}</Text>

                    <Text caption style={style.darkGrey}>
                        {senderText}
                    </Text>
                </View>
            </View>
            <Button
                fullWidth
                containerStyle={[style.button]}
                buttonStyle={[style.detailsButton]}
                onPress={() => setShowDetails(!showDetails)}
                title={
                    <Text medium caption>
                        {showDetails
                            ? t('phrases.hide-details')
                            : t('feature.stabilitypool.details-and-fee')}
                    </Text>
                }
            />
            <Button
                fullWidth
                containerStyle={[style.button]}
                onPress={handleConfirm}
                disabled={isLoading}
                loading={isLoading}
                title={
                    <Text medium caption style={style.buttonText}>
                        {t('words.send')}
                    </Text>
                }
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        bottomBorder: {
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.extraLightGrey,
        },
        detailsGroup: {
            width: '100%',
            marginTop: 'auto',
            flexDirection: 'column',
        },
        button: {
            marginTop: theme.spacing.lg,
        },
        buttonText: {
            color: theme.colors.secondary,
        },
        collapsedContainer: {
            height: 0,
            opacity: 0,
        },
        detailsContainer: {
            width: '100%',
            opacity: 1,
            flexDirection: 'column',
        },
        detailItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 52,
        },
        detailItemTitle: {
            marginRight: 'auto',
        },
        darkGrey: {
            color: theme.colors.darkGrey,
        },
        detailsButton: {
            backgroundColor: theme.colors.offWhite,
        },
        overlayContainer: {
            width: '90%',
            maxWidth: 312,
            padding: theme.spacing.xl,
            borderRadius: theme.borders.defaultRadius,
            alignItems: 'center',
        },
        secondaryAmountText: {
            color: theme.colors.darkGrey,
            textAlign: 'center',
            marginRight: theme.spacing.xs,
            marginTop: theme.spacing.xs,
        },
    })

export default SendPreviewDetails
