import {
    DrawerContentComponentProps,
    DrawerContentScrollView,
    DrawerItem,
} from '@react-navigation/drawer'
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
import { useNavigation } from '@react-navigation/native'

type Props = {
    federation: Federation
}

const FederationDrawerItemLabel = ({ federation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()

    // TODO: Get balance from federation
    // const balance = federation.balance
    const balance = 0

    return (
        <View style={styles(theme).drawerItemLabel}>
            <Image
                style={styles(theme).image}
                source={Images.FederationXIconSm}
            />
            <View style={styles(theme).labelsContainer}>
                <Text h4 numberOfLines={1}>
                    {federation.name}
                </Text>
                <Text style={styles(theme).subText}>
                    {`${balance} ${t('words.sats')}`}
                </Text>
            </View>
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
            source={Images.RainbowGradient}>
            <DrawerContentScrollView {...props} style={styles(theme).container}>
                <Text h3 style={styles(theme).headerTitle}>
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
            padding: 12,
        },
        addFederationText: {
            paddingLeft: 4,
        },
        drawerItem: {
            marginHorizontal: 0,
        },
        drawerItemLabel: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 2,
        },
        labelsContainer: {
            flexDirection: 'column',
            alignItems: 'flex-start',
        },
        imageBackground: {
            height: '100%',
            width: '100%',
            resizeMode: 'cover',
        },
        image: {
            height: 45,
            width: 45,
            marginHorizontal: 12,
            resizeMode: 'contain',
        },
        subText: {
            fontSize: theme.sizes.xs,
        },
        headerTitle: {
            paddingHorizontal: 24,
            paddingVertical: 12,
        },
    })

export default ConnectedFederationsDrawer
