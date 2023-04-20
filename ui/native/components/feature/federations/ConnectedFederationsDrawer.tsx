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

import {
    selectActiveFederation,
    selectFederations,
    setActiveFederationId,
} from '@fedi/common/redux'
import { Federation } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import FederationUtils from '@fedi/common/utils/FederationUtils'

import { Images } from '../../../assets/images'
import {
    useAppDispatch,
    useAppSelector,
    useBtcFiatPrice,
} from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type Props = {
    federation: Federation
}

const FederationDrawerItemLabel = ({ federation }: Props) => {
    const { theme } = useTheme()
    const navigation = useNavigation()
    const { t } = useTranslation()
    const { convertSatsToFormattedFiat } = useBtcFiatPrice()

    const amountInSats = amountUtils.msatToSat(federation.balance)

    const showInviteCode = new FederationUtils(federation).getShowInviteCode()

    return (
        <View style={styles(theme).drawerItemLabel}>
            <SvgImage
                name="FedearationxIcon"
                size={SvgImageSize.lg}
                svgProps={{ stroke: 'transparent' }}
            />
            <View style={styles(theme).labelsContainer}>
                <Text bold numberOfLines={1}>
                    {federation.name}
                </Text>
                <Text style={styles(theme).subText}>
                    {`${amountUtils.formatNumber(amountInSats)} ${t(
                        'words.sats',
                    )} (${convertSatsToFormattedFiat(amountInSats)})`}
                </Text>
            </View>

            {showInviteCode && (
                <Pressable
                    style={styles(theme).iconImage}
                    onPress={() => {
                        navigation.navigate('FederationInvite', {
                            inviteLink: federation.connectInfo,
                        })
                    }}>
                    <SvgImage name="InviteMembers" />
                </Pressable>
            )}
        </View>
    )
}

const ConnectedFederationsDrawer: React.FC<DrawerContentComponentProps> = (
    props: DrawerContentComponentProps,
) => {
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const { theme } = useTheme()
    const dispatch = useAppDispatch()
    const activeFederation = useAppSelector(selectActiveFederation)
    const federations = useAppSelector(selectFederations)

    return (
        <ImageBackground
            style={styles(theme).imageBackground}
            source={Images.HoloBackground}>
            <DrawerContentScrollView {...props} style={styles(theme).container}>
                <Text h2 style={styles(theme).headerTitle}>
                    {t('words.federations')}
                </Text>
                {federations.map((f, i) => (
                    <DrawerItem
                        key={`di-${i}`}
                        label={() => (
                            <FederationDrawerItemLabel federation={f} />
                        )}
                        style={styles(theme).drawerItem}
                        focused={f.id === activeFederation?.id}
                        onPress={() => {
                            dispatch(setActiveFederationId(f.id))
                        }}
                    />
                ))}
            </DrawerContentScrollView>
            <Pressable
                disabled
                style={styles(theme).addFederationButton}
                onPress={() => {
                    navigation.navigate('ScanFederationCode')
                }}>
                <SvgImage name="Plus" />
                <Text style={styles(theme).addFederationText}>
                    {t('feature.federations.add-federation')}
                </Text>
            </Pressable>
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
            padding: theme.spacing.md,
            opacity: 0.1,
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
            paddingHorizontal: theme.spacing.xxs,
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
    })

export default ConnectedFederationsDrawer
