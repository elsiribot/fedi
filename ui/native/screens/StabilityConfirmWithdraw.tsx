import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Avatar, Button, Divider, Text, Theme } from '@rneui/themed'
import { useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useBtcFiatPrice } from '@fedi/common/hooks/amount'
import { selectCurrency, decreaseStableBalance } from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { fedimint } from '../bridge'
import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'StabilityConfirmWithdraw'
>

const StabilityConfirmWithdraw: React.FC<Props> = ({ route, navigation }) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const { amount } = route.params
    const { toast } = useEnvironmentContext().state
    const [processingDeposit, setProcessingDeposit] = useState<boolean>(false)
    const [showDetails, setShowDetails] = useState<boolean>(false)
    const { convertSatsToFormattedFiat } = useBtcFiatPrice()
    const selectedFiatCurrency = useAppSelector(selectCurrency)
    const formattedFiat = convertSatsToFormattedFiat(amount)

    const handleSubmit = async () => {
        try {
            setProcessingDeposit(true)
            const amountToWithdraw = amountUtils.satToMsat(amount)
            await dispatch(
                decreaseStableBalance({
                    fedimint,
                    amount: amountToWithdraw,
                }),
            ).unwrap()
            navigation.replace('StabilityWithdrawInitiated', {
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
                <Text medium style={[style.darkGrey]}>
                    {t('feature.stabilitypool.amount-may-vary-during-withdraw')}
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
                            'feature.stabilitypool.withdraw-to',
                        )}`}</Text>
                        <Text caption style={style.darkGrey}>
                            {`${t('feature.stabilitypool.bitcoin-balance')}`}
                        </Text>
                    </View>
                    <Divider />
                    <View style={style.detailItem}>
                        <Text caption bold style={style.darkGrey}>{`${t(
                            'words.fees',
                        )}`}</Text>

                        <Text caption style={style.darkGrey}>
                            {`0 ${selectedFiatCurrency}`}
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
                                : t('words.details')}
                        </Text>
                    }
                />
                <Button
                    fullWidth
                    containerStyle={[style.button]}
                    onPress={handleSubmit}
                    disabled={processingDeposit}
                    loading={processingDeposit}
                    title={
                        <Text medium caption style={style.buttonText}>
                            {t('words.withdraw')}
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
            alignItems: 'center',
        },
        buttonsGroup: {
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

export default StabilityConfirmWithdraw
