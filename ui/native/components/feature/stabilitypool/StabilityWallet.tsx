import { useNavigation } from '@react-navigation/native'
import { Avatar, Theme } from '@rneui/themed'
import { Card, Text, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { selectCurrency } from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'
import SvgImage from '../../ui/SvgImage'

const StabilityWallet: React.FC<{}> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const stabilityPoolBalance = 0
    const selectedCurrency = useAppSelector(selectCurrency)

    const style = styles(theme)

    return (
        <Card containerStyle={style.container} wrapperStyle={style.cardWrapper}>
            <Pressable
                style={style.titleContainer}
                onPress={() => navigation.navigate('StabilityHome')}>
                <Avatar
                    size={theme.sizes.md}
                    rounded
                    title="USD"
                    titleStyle={style.currencyAvatarTitle}
                    containerStyle={style.currencyAvatar}
                />
                <Text bold style={style.titleText}>
                    {`${selectedCurrency}`}
                </Text>
                <Text medium style={style.balanceText}>
                    {`${stabilityPoolBalance} ${selectedCurrency}`}
                </Text>
                <SvgImage name="ChevronRight" color={theme.colors.primary} />
            </Pressable>
        </Card>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            backgroundColor: theme.colors.offWhite,
            borderRadius: theme.borders.defaultRadius,
            padding: theme.spacing.lg,
            width: '100%',
            marginVertical: theme.spacing.lg,
            borderWidth: 0,
            shadowColor: 'transparent',
        },
        balanceText: {
            color: theme.colors.primary,
            marginLeft: 'auto',
            paddingHorizontal: theme.spacing.sm,
            flex: 1,
            textAlign: 'right',
        },
        cardWrapper: {
            flex: 1,
            justifyContent: 'space-between',
            gap: theme.spacing.lg,
        },
        currencyAvatar: {
            backgroundColor: theme.colors.green,
        },
        currencyAvatarTitle: {
            ...theme.styles.avatarText,
        },
        titleContainer: {
            textAlign: 'left',
            flexDirection: 'row',
            alignItems: 'center',
        },
        titleText: {
            color: theme.colors.primary,
            paddingHorizontal: theme.spacing.sm,
            flex: 1,
        },
        buttonsGroupContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: theme.spacing.lg,
        },
        button: {
            backgroundColor: theme.colors.secondary,
        },
        buttonContainer: {
            flex: 1,
        },
        buttonTitle: {
            color: theme.colors.primary,
        },
    })

export default StabilityWallet
