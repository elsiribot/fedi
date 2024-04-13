import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'

import { useAmountFormatter } from '@fedi/common/hooks/amount'
import {
    selectActiveFederation,
    selectFederationsWithBalances,
} from '@fedi/common/redux'
import { RpcFederation } from '@fedi/common/types/bindings'

import { useAppSelector } from '../../../state/hooks'
import { MSats } from '../../../types'
import CustomOverlay from '../../ui/CustomOverlay'
import { FederationLogo } from '../../ui/FederationLogo'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

const FederationWalletSelector: React.FC = () => {
    const { theme } = useTheme()
    const [opened, setOpened] = useState<boolean>(false)
    const { t } = useTranslation()
    const style = styles(theme)
    const activeFederation = useAppSelector(selectActiveFederation)
    const federations = useAppSelector(selectFederationsWithBalances)
    const [federationToSendFrom, setFederationToSendFrom] = useState<
        RpcFederation | undefined
    >(activeFederation)

    const { makeFormattedAmountsFromMSats } = useAmountFormatter()
    const {
        formattedPrimaryAmount: primaryAmountToSendFrom,
        formattedSecondaryAmount: secondaryAmountToSendFrom,
    } = makeFormattedAmountsFromMSats(
        federationToSendFrom?.balance || (0 as MSats),
    )

    const renderFederation = (f: RpcFederation) => {
        const { formattedPrimaryAmount, formattedSecondaryAmount } =
            makeFormattedAmountsFromMSats(f?.balance || (0 as MSats))
        return (
            <Pressable
                style={style.tileContainer}
                onPress={() => setFederationToSendFrom(f)}>
                <FederationLogo federation={f} size={32} />
                <View style={style.tileTextContainer}>
                    <Text bold numberOfLines={1}>
                        {f?.name || ''}
                    </Text>
                    <Text style={{}}>
                        {`${formattedPrimaryAmount} (${formattedSecondaryAmount})`}
                    </Text>
                </View>
                {federationToSendFrom?.id === f.id && (
                    <SvgImage
                        name="Check"
                        size={SvgImageSize.sm}
                        containerStyle={{
                            marginLeft: 'auto',
                        }}
                    />
                )}
            </Pressable>
        )
    }

    return (
        <View style={style.container}>
            <Pressable
                style={style.selectedFederation}
                onPress={() => setOpened(true)}>
                <FederationLogo federation={federationToSendFrom} size={32} />
                <View style={style.tileTextContainer}>
                    <Text caption bold numberOfLines={1}>
                        {federationToSendFrom?.name || ''}
                    </Text>
                    <Text
                        style={{ color: theme.colors.darkGrey }}
                        medium
                        caption
                        numberOfLines={1}>
                        {`${primaryAmountToSendFrom} (${secondaryAmountToSendFrom})`}
                    </Text>
                </View>
                <SvgImage
                    name="ChevronRight"
                    size={SvgImageSize.sm}
                    containerStyle={{
                        transform: [{ rotate: '90deg' }],
                        marginLeft: 'auto',
                    }}
                />
            </Pressable>
            <CustomOverlay
                show={opened}
                onBackdropPress={() => setOpened(false)}
                contents={{
                    title: t('phrases.select-federation'),
                    body: (
                        <View style={style.federationsList}>
                            {federations.map(renderFederation)}
                        </View>
                    ),
                }}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            width: '100%',
            alignItems: 'center',
        },
        selectedFederation: {
            flexDirection: 'row',
            alignItems: 'center',
            width: 280,
            backgroundColor: theme.colors.offWhite,
            borderRadius: 44,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
            gap: 10,
        },
        federationsList: {
            paddingTop: theme.spacing.md,
            alignItems: 'flex-start',
            width: '100%',
        },
        tileContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: theme.spacing.md,
            gap: 12,
            width: '100%',
        },
        tileTextContainer: {
            flexDirection: 'column',
            gap: theme.spacing.xs,
            maxWidth: '60%',
        },
    })

export default FederationWalletSelector
