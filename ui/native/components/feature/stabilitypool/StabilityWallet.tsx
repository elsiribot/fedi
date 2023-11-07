import { useNavigation } from '@react-navigation/native'
import { Avatar, Theme } from '@rneui/themed'
import { Card, Text, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { selectCurrency } from '@fedi/common/redux'

import { useAppSelector, useStabilityPool } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'
import SvgImage from '../../ui/SvgImage'

const StabilityWallet: React.FC<{}> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const selectedCurrency = useAppSelector(selectCurrency)
    const { formattedStableBalance, refreshBalance } = useStabilityPool()

    // Make sure we have a fresh balance on initial render
    useEffect(() => {
        refreshBalance()
    }, [refreshBalance])

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
                        title={selectedCurrency}
                        titleStyle={style.currencyAvatarTitle}
                        containerStyle={style.currencyAvatar}
                    />
                    <Text bold style={style.titleText}>
                        {`${selectedCurrency}`}
                    </Text>
                    <Text medium style={style.balanceText}>
                        {`${formattedStableBalance}`}
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
