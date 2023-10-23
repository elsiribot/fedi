import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Avatar, Button, Text, Theme } from '@rneui/themed'
import { useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useBtcFiatPrice } from '@fedi/common/hooks/amount'
import { selectCurrency } from '@fedi/common/redux'

import HoloCircle from '../components/ui/HoloCircle'
import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'StabilityWithdrawInitiated'
>

const StabilityWithdrawInitiated: React.FC<Props> = ({ route, navigation }) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { amount } = route.params
    const { convertSatsToFormattedFiat } = useBtcFiatPrice()
    const formattedFiat = convertSatsToFormattedFiat(amount)
    const selectedFiatCurrency = useAppSelector(selectCurrency)

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
            <View style={style.holoCircleContainer}>
                <HoloCircle
                    content={
                        <View style={style.holoContentContainer}>
                            <SvgImage name="Check" size={SvgImageSize.md} />
                            <Text medium style={[style.holoText]}>{`${t(
                                'feature.stabilitypool.will-be-withdrawn',
                                {
                                    amount: formattedFiat,
                                    // Get deposit time from client config?
                                    expectedWait: '10 min or less',
                                },
                            )}`}</Text>
                            <Text
                                caption
                                medium
                                style={[style.holoText, style.darkGrey]}>
                                {t('feature.stabilitypool.amount-may-vary')}
                            </Text>
                        </View>
                    }
                />
            </View>
            <Button
                fullWidth
                containerStyle={style.button}
                onPress={() => navigation.navigate('StabilityHome')}
                title={
                    <Text medium caption style={style.buttonText}>
                        {t('words.okay')}
                    </Text>
                }
            />
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
        holoCircleContainer: {
            marginTop: 'auto',
        },
        holoContentContainer: {
            textAlign: 'center',
            alignItems: 'center',
        },
        holoText: {
            textAlign: 'center',
            paddingVertical: theme.spacing.xs,
            maxWidth: 200,
        },
        darkGrey: {
            color: theme.colors.darkGrey,
        },
        button: {
            marginTop: 'auto',
        },
        buttonText: {
            color: theme.colors.secondary,
        },
    })

export default StabilityWithdrawInitiated
