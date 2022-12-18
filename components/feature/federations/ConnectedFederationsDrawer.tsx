import {
    DrawerContentComponentProps,
    DrawerContentScrollView,
    DrawerItem,
} from '@react-navigation/drawer'
import { useNavigation } from '@react-navigation/native'
import { Button, Icon, Image, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
    ImageBackground,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native'
import {
    changeSelectedFederation,
    resetFederationsState,
    updateConnectedFederations,
    useFederationsContext,
} from '../../../contexts/FederationsContext'
import { Federation, listFederations } from '../../../bridge'
import { Images } from '../../../assets/images'

type Props = {
    federation: Federation
}

const FederationDrawerItemLabel = ({ federation }: Props) => {
    const { theme } = useTheme()
    const navigation = useNavigation()
    const { t } = useTranslation()

    // TODO: Get balance from federation
    // const balance = federation.balance
    const balance = 0

    const inviteLink = JSON.stringify(federation.connectInfo)

    return (
        <View style={styles(theme).drawerItemLabel}>
            <Image
                style={styles(theme).image}
                source={Images.FederationXIconSm}
            />
            <View style={styles(theme).labelsContainer}>
                <Text bold numberOfLines={1}>
                    {federation.name}
                </Text>
                <Text style={styles(theme).subText}>
                    {`${balance} ${t('words.sats')}`}
                </Text>
            </View>

            <TouchableOpacity
                style={styles(theme).iconImage}
                onPress={() => {
                    navigation.navigate('FederationInvite', {
                        inviteLink,
                    })
                }}>
                <Image
                    style={styles(theme).iconImage}
                    source={Images.InviteMembers}
                />
            </TouchableOpacity>
        </View>
    )
}

const ConnectedFederationsDrawer: React.FC<DrawerContentComponentProps> = (
    props: DrawerContentComponentProps,
) => {
    const { t } = useTranslation()
    const navigation = useNavigation()
    const { theme } = useTheme()
    const { state, dispatch } = useFederationsContext()
    const { selectedFederation, connectedFederations } = state

    useEffect(() => {
        const refreshFederations = async () => {
            const federations = await listFederations()
            if (federations.length > 0) {
                dispatch(updateConnectedFederations(federations))
            }
        }

        refreshFederations()
    }, [dispatch])

    console.log('connectedFederations', connectedFederations)

    return (
        <ImageBackground
            style={styles(theme).imageBackground}
            source={Images.HoloBackground}>
            <DrawerContentScrollView {...props} style={styles(theme).container}>
                <Text h2 style={styles(theme).headerTitle}>
                    {t('words.federations')}
                </Text>
                {connectedFederations.map((f, i) => (
                    <DrawerItem
                        key={`di-${i}`}
                        label={() => (
                            <FederationDrawerItemLabel federation={f} />
                        )}
                        style={styles(theme).drawerItem}
                        focused={f.name === selectedFederation?.name}
                        onPress={() => {
                            dispatch(changeSelectedFederation(f))
                        }}
                    />
                ))}
            </DrawerContentScrollView>
            <TouchableOpacity
                style={styles(theme).addFederationButton}
                onPress={() => {
                    navigation.navigate('ScanFederationCode')
                }}>
                <Icon name="add" type="material" />
                <Text style={styles(theme).addFederationText}>
                    {t('feature.federations.add-federation')}
                </Text>
            </TouchableOpacity>

            {/* For dev purposes only */}
            <Button
                title={'Reset Federations State'}
                type="clear"
                onPress={() => {
                    dispatch(resetFederationsState())
                }}
            />
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
