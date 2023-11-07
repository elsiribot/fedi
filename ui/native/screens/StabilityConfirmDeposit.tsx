import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Avatar, Divider, Text, Theme } from '@rneui/themed'
import { useTheme } from '@rneui/themed'
import { Button } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useBtcFiatPrice } from '@fedi/common/hooks/amount'
import { increaseStableBalance, selectCurrency } from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { fedimint } from '../bridge'
import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'StabilityConfirmDeposit'
>

const StabilityConfirmDeposit: React.FC<Props> = ({ route, navigation }) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const { amount } = route.params
    const { toast } = useEnvironmentContext().state
    const [processingDeposit, setProcessingDeposit] = useState<boolean>(false)
    const [showDetails, setShowDetails] = useState<boolean>(false)
    const { convertSatsToFormattedUsd, convertSatsToFormattedFiat } =
        useBtcFiatPrice()
    const selectedFiatCurrency = useAppSelector(selectCurrency)
    const formattedFiat = convertSatsToFormattedFiat(amount)
    const formattedUsd = convertSatsToFormattedUsd(amount)
    const formattedSats = `${amountUtils.formatSats(amount)} ${t(
        'words.sats',
    ).toUpperCase()}`

    const handleSubmit = async () => {
        try {
            setProcessingDeposit(true)
            const amountToDeposit = amountUtils.satToMsat(amount)
            await dispatch(
                increaseStableBalance({
                    fedimint,
                    amount: amountToDeposit,
                }),
            ).unwrap()
            navigation.replace('StabilityDepositInitiated', {
                amount,
            })
        } catch (error) {
            toast?.show(t('errors.unknown-error'))
        }
    }

    const style = styles(theme)

    return (
        <View style={style.container}>
            <View style={style.conversionIndicator}>
                <SvgImage
                    name="BitcoinCircle"
                    size={SvgImageSize.md}
                    color={theme.colors.orange}
                />
                <SvgImage name="ArrowRight" color={theme.colors.primaryLight} />
                <Avatar
                    size={theme.sizes.md}
                    rounded
                    title={selectedFiatCurrency}
                    titleStyle={style.currencyAvatarTitle}
                    containerStyle={style.currencyAvatar}
                />
            </View>
            <View style={style.amountText}>
                <Text h1 numberOfLines={1}>
                    {formattedFiat}
                </Text>
            </View>
            <View style={style.buttonsGroup}>
                <View
                    style={[
                        showDetails
                            ? style.detailsContainer
                            : style.collapsedContainer,
                    ]}>
                    <View style={style.detailItem}>
                        <Text caption bold style={style.darkGrey}>{`${t(
                            'feature.stabilitypool.deposit-from',
                        )}`}</Text>
                        <Text caption style={style.darkGrey}>
                            {`${t('feature.stabilitypool.bitcoin-balance')}`}
                        </Text>
                    </View>
                    <Divider />
                    <View style={style.detailItem}>
                        <Text caption bold style={style.darkGrey}>{`${t(
                            'feature.stabilitypool.bitcoin-amount',
                        )}`}</Text>
                        <Text
                            caption
                            style={style.darkGrey}>{`${formattedSats}`}</Text>
                    </View>
                    <Divider />
                    <View style={style.detailItem}>
                        <Text caption bold style={style.darkGrey}>{`USD ${t(
                            'words.amount',
                        )}`}</Text>
                        <Text
                            caption
                            style={style.darkGrey}>{`${formattedUsd}`}</Text>
                    </View>
                    <Divider />
                    <View style={style.detailItem}>
                        <Text caption bold style={style.darkGrey}>{`${t(
                            'words.fees',
                        )}`}</Text>

                        <Text caption style={style.darkGrey}>
                            {/* TODO: Get fees from client config */}
                            {`5% APR or less`}
                        </Text>
                    </View>
                    <Divider />
                    <View style={style.detailItem}>
                        <Text caption bold style={style.darkGrey}>{`${t(
                            'feature.stabilitypool.deposit-time',
                        )}`}</Text>
                        <Text caption style={style.darkGrey}>
                            {/* TODO: Get deposit time from client config? */}
                            {`10 min or less`}
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
                    onPress={handleSubmit}
                    disabled={processingDeposit}
                    title={
                        <Text medium caption style={style.buttonText}>
                            {t('words.deposit')}
                        </Text>
                    }
                />
            </View>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flexDirection: 'column',
            flex: 1,
            alignItems: 'center',
            padding: theme.spacing.lg,
        },
        amountText: {
            marginTop: 'auto',
        },
        buttonsGroup: {
            width: '100%',
            marginTop: 'auto',
            flexDirection: 'column',
        },
        button: {
            marginTop: theme.spacing.sm,
        },
        buttonText: {
            color: theme.colors.secondary,
        },
        conversionIndicator: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
        },
        currencyAvatar: {
            backgroundColor: theme.colors.green,
        },
        currencyAvatarTitle: {
            ...theme.styles.avatarText,
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
        darkGrey: {
            color: theme.colors.darkGrey,
        },
        detailsButton: {
            backgroundColor: theme.colors.offWhite,
        },
    })

export default StabilityConfirmDeposit
