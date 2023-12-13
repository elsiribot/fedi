import {
    DrawerContentComponentProps,
    DrawerContentScrollView,
    DrawerItem,
} from '@react-navigation/drawer'
import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useBtcFiatPrice } from '@fedi/common/hooks/amount'
import {
    selectActiveFederationId,
    selectFederations,
    selectHasUnseenMessages,
    selectHasUnseenPaymentUpdates,
} from '@fedi/common/redux'
import { Federation } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { shouldShowInviteCode } from '@fedi/common/utils/FederationUtils'

import { Images } from '../../../assets/images'
import { useAppSelector } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'
import { FederationLogo } from '../../ui/FederationLogo'
import SvgImage from '../../ui/SvgImage'

type Props = {
    federation: Federation
}

const FederationDrawerItemLabel = ({ federation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation()
    const { convertSatsToFormattedFiat } = useBtcFiatPrice()
    const hasNewMessages = useAppSelector(s =>
        selectHasUnseenMessages(s, federation.id),
    )
    const hasNewPaymentUpdates = useAppSelector(s =>
        selectHasUnseenPaymentUpdates(s, federation.id),
    )

    const amountInSats = amountUtils.msatToSat(federation.balance)

    const showInviteCode = shouldShowInviteCode(federation.meta)

    const style = styles(theme)
    return (
        <View style={style.drawerItemLabel}>
            <View
                style={[
                    style.unreadIndicator,
                    hasNewMessages || hasNewPaymentUpdates
                        ? { opacity: 1 }
                        : { opacity: 0 },
                ]}
            />
            <FederationLogo federation={federation} size={48} />
            <View style={style.labelsContainer}>
                <Text bold numberOfLines={1}>
                    {federation.name}
                </Text>
                <Text style={style.subText}>
                    {`${amountUtils.formatNumber(amountInSats)} ${t(
                        'words.sats',
                    )} (${convertSatsToFormattedFiat(amountInSats)})`}
                </Text>
            </View>

            {showInviteCode && (
                <Pressable
                    style={style.iconImage}
                    onPress={() => {
                        navigation.navigate('FederationInvite', {
                            inviteLink: federation.inviteCode,
                        })
                    }}>
                    <SvgImage name="Qr" />
                </Pressable>
            )}
        </View>
    )
}

const ConnectedFederationsDrawer: React.FC<DrawerContentComponentProps> = (
    props: DrawerContentComponentProps,
) => {
    const { t } = useTranslation()
    const drawerNavigation = props.navigation
    const mainNavigation = useNavigation<NavigationHook>()
    const { theme } = useTheme()
    const activeFederationId = useAppSelector(selectActiveFederationId)
    const federations = useAppSelector(selectFederations)

    const style = styles(theme)
    return (
        <ImageBackground
            style={style.imageBackground}
            source={Images.HoloBackground}>
            <DrawerContentScrollView {...props} style={style.container}>
                <Text
                    h2
                    style={style.headerTitle}
                    numberOfLines={1}
                    adjustsFontSizeToFit>
                    {t('words.federations')}
                </Text>
                {federations.map((f, i) => (
                    <DrawerItem
                        key={`di-${i}`}
                        label={() => (
                            <FederationDrawerItemLabel federation={f} />
                        )}
                        style={style.drawerItem}
                        focused={f.id === activeFederationId}
                        onPress={() => {
                            // Dismiss drawer if active federation is clicked
                            if (f.id === activeFederationId) {
                                return drawerNavigation.closeDrawer()
                            }
                            drawerNavigation.reset({
                                index: 0,
                                routes: [
                                    {
                                        name: 'SwitchingFederations',
                                        params: { federationId: f.id },
                                    },
                                ],
                            })
                        }}
                    />
                ))}
            </DrawerContentScrollView>
            <SafeAreaView edges={['bottom', 'left']}>
                <Pressable
                    style={style.addFederationButton}
                    onPress={() => {
                        mainNavigation.navigate('JoinFederation', {
                            invite: undefined,
                        })
                    }}>
                    <SvgImage
                        name="Plus"
                        color={theme.colors.darkGrey}
                        maxFontSizeMultiplier={1.8}
                    />
                    <Text
                        style={style.addFederationText}
                        caption
                        maxFontSizeMultiplier={1.8}>
                        {t('feature.federations.add-federation')}
                    </Text>
                </Pressable>
            </SafeAreaView>
        </ImageBackground>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            padding: 0,
        },
        addFederationButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            overflow: 'hidden',
            gap: theme.spacing.xs,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
            color: theme.colors.darkGrey,
        },
        addFederationText: {
            paddingLeft: theme.spacing.xs,
        },
        drawerItem: {
            marginHorizontal: 0,
        },
        // Unusual width sizings needed here due to the DrawerItem having
        // some obfuscated styles blocking us from using the full width of the drawer
        drawerItemLabel: {
            flexDirection: 'row',
            alignItems: 'center',
            width: '110%',
            paddingRight: theme.spacing.xxs,
        },
        labelsContainer: {
            // Makes sure very long federation names do not overflow
            maxWidth: '60%',
            flexGrow: 1,
            flexDirection: 'column',
            alignItems: 'flex-start',
            marginLeft: theme.spacing.sm,
        },
        iconImage: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        image: {
            height: theme.sizes.lg,
            width: theme.sizes.lg,
            marginHorizontal: theme.spacing.md,
            resizeMode: 'contain',
        },
        imageBackground: {
            height: '100%',
            width: '100%',
            resizeMode: 'cover',
        },
        subText: {
            fontSize: theme.sizes.xxs,
        },
        headerTitle: {
            paddingHorizontal: theme.spacing.xl,
            paddingVertical: theme.spacing.md,
        },
        unreadIndicator: {
            backgroundColor: theme.colors.red,
            height: theme.sizes.unreadIndicatorSize,
            width: theme.sizes.unreadIndicatorSize,
            marginRight: theme.spacing.xs,
            borderRadius: theme.sizes.unreadIndicatorSize * 0.5,
        },
    })

export default ConnectedFederationsDrawer
