import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import toUpper from 'lodash/toUpper'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import { LinearGradientProps } from 'react-native-linear-gradient'

import { useAmountFormatter } from '@fedi/common/hooks/amount'
import { selectCurrency } from '@fedi/common/redux'
import { MSats } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { useAppSelector } from '../../../state/hooks'
import { BubbleCard } from '../../ui/BubbleView'
import Flex from '../../ui/Flex'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

const StabilityWalletPlaceholder: React.FC = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation()
    const stylesPlaceholder = styles(theme)

    const selectedCurrency = useAppSelector(selectCurrency)

    const { makeFormattedAmountsFromMSats } = useAmountFormatter()
    const zeroMsats = 0 as MSats
    const { formattedPrimaryAmount } = makeFormattedAmountsFromMSats(zeroMsats)

    const gradientProps: LinearGradientProps = {
        colors: ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.0)'],
        start: { x: 0, y: 0 },
        end: { x: 0, y: 1 },
    }

    return (
        <Pressable onPress={() => navigation.navigate('PublicFederations')}>
            <BubbleCard
                linearGradientProps={gradientProps}
                containerStyle={[stylesPlaceholder.card, { height: 100 }]}>
                <Flex
                    row
                    align="center"
                    justify="between"
                    style={stylesPlaceholder.headerContainer}>
                    <Flex row align="center" gap="sm">
                        <Flex row align="center" gap="sm">
                            <SvgImage
                                name="UsdCircle"
                                size={SvgImageSize.md}
                                color={theme.colors.white}
                            />
                            <Text bold style={stylesPlaceholder.title}>
                                {`${toUpper(selectedCurrency)} ${t(
                                    'feature.stabilitypool.stable-balance',
                                )}`}
                            </Text>
                        </Flex>
                        <SvgImage
                            name="ChevronRightSmall"
                            color={theme.colors.secondary}
                            dimensions={{ width: 6, height: 12 }}
                        />
                    </Flex>
                    {/* Balance on the right */}
                    <Flex align="end">
                        <Text style={stylesPlaceholder.balanceTextMain}>
                            {amountUtils.stripTrailingZerosWithSuffix(
                                formattedPrimaryAmount,
                            )}
                        </Text>
                    </Flex>
                </Flex>
                <Flex
                    row
                    justify="between"
                    gap="lg"
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
            backgroundColor: theme.colors.mint,
            height: 100,
        },
        headerContainer: {
            marginBottom: theme.spacing.lg,
        },
        title: {
            color: theme.colors.secondary,
            fontSize: 16,
        },
        balanceTextMain: {
            color: theme.colors.white,
            fontSize: 18,
            fontWeight: 'bold',
        },
        svgStyle: {
            /* no longer used after row alignment */
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

export default StabilityWalletPlaceholder
