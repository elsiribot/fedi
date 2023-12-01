import { Divider, Text, Theme, useTheme } from '@rneui/themed'
import { Avatar } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import {
    Keyboard,
    Pressable,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native'

import { selectCurrency } from '@fedi/common/redux'
import { StabilityPoolTxn } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import dateUtils from '@fedi/common/utils/DateUtils'

import { useAppSelector } from '../../../state/hooks'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type StabilityTransactionDetailProps = {
    txn: StabilityPoolTxn
    handleCloseModal: () => void
    refreshTransactions?: () => void
}

const StabilityTransactionDetail = ({
    txn,
    handleCloseModal,
}: StabilityTransactionDetailProps) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const selectedCurrency = useAppSelector(selectCurrency)

    const renderStatus = () => {
        return txn.status
    }

    const style = styles(theme)
    return (
        <Pressable style={style.container} onPress={Keyboard.dismiss}>
            <TouchableOpacity
                style={style.closeIconContainer}
                onPress={() => {
                    handleCloseModal()
                }}>
                <SvgImage name="Close" size={SvgImageSize.md} />
            </TouchableOpacity>
            <Avatar
                size={theme.sizes.md}
                rounded
                title={selectedCurrency}
                titleStyle={style.currencyAvatarTitle}
                containerStyle={style.currencyAvatar}
            />
            <Text h2 h2Style={style.titleContainer}>
                {`${`${
                    txn.direction === 'deposit'
                        ? t('words.deposit')
                        : t('words.withdrawal')
                }`} ${amountUtils.formatFiat(
                    txn.amountCents / 100,
                    selectedCurrency,
                )} `}
            </Text>
            <View style={style.detailItemsContainer}>
                {txn.timestamp && (
                    <>
                        <Divider />
                        <View style={style.detailItem}>
                            <Text>{`${t('words.time')}`}</Text>
                            <Text>{`${dateUtils.formatTimestamp(
                                txn.timestamp,
                                'MMM dd yyyy, h:mmaaa',
                            )}`}</Text>
                        </View>
                    </>
                )}
                <Divider />
                <View style={style.detailItem}>
                    <Text>{`${t('words.status')}`}</Text>
                    <Text>{renderStatus()}</Text>
                </View>
            </View>
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        icon: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        container: {
            alignItems: 'center',
            margin: theme.spacing.md,
            width: '100%',
        },
        closeIconContainer: {
            alignSelf: 'flex-end',
        },
        currencyAvatar: {
            backgroundColor: theme.colors.green,
        },
        currencyAvatarTitle: {
            ...theme.styles.avatarText,
        },
        titleContainer: {
            marginVertical: theme.spacing.sm,
        },
        detailItemsContainer: {
            marginTop: theme.spacing.xl,
            width: '90%',
        },
        detailItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 36,
        },
        inputOuterContainer: {
            width: '70%',
            height: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            paddingRight: 0,
        },
        inputInnerContainer: {
            borderBottomColor: 'transparent',
            height: '100%',
            width: '100%',
        },
        focusedInputInnerContainer: {
            borderBottomColor: theme.colors.primary,
        },
        input: {
            fontSize: 14,
            textAlign: 'right',
        },
        focusedInput: {
            // marginBottom: 0,
        },
    })

export default StabilityTransactionDetail
