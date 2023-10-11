import { useNavigation } from '@react-navigation/native'
import { Avatar, Theme } from '@rneui/themed'
import { Card, Text, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { selectStableBalance, selectStableCurrency } from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'
import SvgImage from '../../ui/SvgImage'

const StabilityWallet: React.FC<{}> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const stableBalance = useAppSelector(selectStableBalance)
    const stableCurrency = useAppSelector(selectStableCurrency)

    const style = styles(theme)

    return (
        <Pressable
            style={style.container}
            onPress={() => navigation.navigate('StabilityHome')}>
            <Card
                containerStyle={style.cardContainer}
                wrapperStyle={style.cardWrapper}>
                <View style={style.titleContainer}>
                    <Avatar
                        size={theme.sizes.md}
                        rounded
                        title={stableCurrency}
                        titleStyle={style.currencyAvatarTitle}
                        containerStyle={style.currencyAvatar}
                    />
                    <Text bold style={style.titleText}>
                        {`${stableCurrency}`}
                    </Text>
                    <Text medium style={style.balanceText}>
                        {`${stableBalance} ${stableCurrency}`}
                    </Text>
                    <SvgImage
                        name="ChevronRight"
                        color={theme.colors.primary}
                    />
                </View>
            </Card>
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            width: '100%',
            marginVertical: theme.spacing.lg,
        },
        balanceText: {
            color: theme.colors.primary,
            marginLeft: 'auto',
            paddingHorizontal: theme.spacing.sm,
            flex: 1,
            textAlign: 'right',
        },
        cardContainer: {
            borderRadius: theme.borders.defaultRadius,
            backgroundColor: theme.colors.offWhite,
            padding: theme.spacing.lg,
            borderWidth: 0,
            shadowColor: 'transparent',
            margin: 0,
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
        button: {
            backgroundColor: theme.colors.secondary,
        },
    })

export default StabilityWallet
