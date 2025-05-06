import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import { LinearGradientProps } from 'react-native-linear-gradient'

import { useAmountFormatter } from '@fedi/common/hooks/amount'
import { MSats } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { BubbleCard } from '../../ui/BubbleView'
import Flex from '../../ui/Flex'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

const BitcoinWalletPlaceholder: React.FC = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const stylesPlaceholder = styles(theme)
    const navigation = useNavigation()

    const { makeFormattedAmountsFromMSats } = useAmountFormatter()
    // convert 0 sats → 0 msats (MSats)
    const zeroMsats = 0 as MSats
    const { formattedPrimaryAmount, formattedSecondaryAmount } =
        makeFormattedAmountsFromMSats(zeroMsats)

    const gradientProps: LinearGradientProps = {
        colors: ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.0)'],
        start: { x: 0, y: 0 },
        end: { x: 0, y: 1 },
    }

    return (
        <Pressable onPress={() => navigation.navigate('PublicFederations')}>
            <BubbleCard
                linearGradientProps={gradientProps}
                containerStyle={[stylesPlaceholder.card, { height: 99 }]}>
                <Flex
                    row
                    align="center"
                    justify="between"
                    style={stylesPlaceholder.headerContainer}>
                    <Flex row align="center" gap="sm">
                        <Flex row align="center" gap="sm">
                            <SvgImage
                                name="BitcoinCircle"
                                size={SvgImageSize.md}
                                color={theme.colors.white}
                            />
                            <View>
                                <Flex row align="center" gap="sm">
                                    <Text bold style={stylesPlaceholder.title}>
                                        {t('words.bitcoin')}
                                    </Text>
                                </Flex>
                            </View>
                        </Flex>
                        <SvgImage
                            name="ChevronRightSmall"
                            color={theme.colors.secondary}
                            dimensions={{ width: 6, height: 12 }}
                        />
                    </Flex>
                    <Flex align="end">
                        <Text medium style={stylesPlaceholder.balanceTextMain}>
                            {amountUtils.stripTrailingZerosWithSuffix(
                                formattedPrimaryAmount,
                            )}
                        </Text>
                        <Text
                            allowFontScaling={false}
                            small
                            style={stylesPlaceholder.balanceTextSats}>
                            {formattedSecondaryAmount}
                        </Text>
                    </Flex>
                </Flex>
                <Flex
                    row
                    justify="between"
                    gap="md"
                    style={stylesPlaceholder.buttonsContainer}>
                    <Text style={stylesPlaceholder.buttonLabel}>
                        {t('feature.wallet.join-federation')}
                    </Text>
                </Flex>
            </BubbleCard>
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        card: {
            backgroundColor: theme.colors.orange,
            height: 99,
        },
        headerContainer: {
            marginBottom: theme.spacing.lg,
        },
        titleContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
        },
        title: {
            color: theme.colors.secondary,
            fontSize: 16,
        },
        subtitle: {
            color: theme.colors.secondary,
            fontSize: 12,
        },
        balanceTextMain: {
            color: theme.colors.white,
            fontSize: 18,
            fontWeight: 'bold',
        },
        balanceTextSats: {
            color: theme.colors.white,
            fontSize: 12,
        },
        buttonsContainer: {
            top: -20,
        },
        buttonLabel: {
            textAlign: 'center',
            color: theme.colors.white,
            padding: theme.spacing.sm,
            fontSize: 14,
            fontWeight: '500',
            left: -6,
        },
    })

export default BitcoinWalletPlaceholder
