import { Icon, Image, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'

import { Images } from '../../../assets/images'
import { Federation } from '../../../bridge'
import { useFederationsContext } from '../../../contexts/FederationsContext'
import { DRAWER_NAVIGATION_ID } from '../../../types/navigation'
import Header from '../../ui/Header'

export type Props = { navigation: any }

const SelectedFederationHeader: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { state } = useFederationsContext()
    const selectedFederation: Federation | null = state.selectedFederation

    const openFederationsDrawer = () => {
        navigation.getParent(DRAWER_NAVIGATION_ID).openDrawer()
    }

    return (
        <Header
            centerContainerStyle={{ flex: 10 }}
            headerCenter={
                <TouchableOpacity
                    style={styles(theme).container}
                    onPress={openFederationsDrawer}>
                    <Image
                        style={styles(theme).image}
                        source={Images.FederationXIconXs}
                    />
                    <Text medium small style={styles(theme).federationName}>
                        {selectedFederation?.name}
                    </Text>
                    <Icon
                        name={'angle-right'}
                        type="font-awesome"
                        size={theme.sizes.xs}
                    />
                </TouchableOpacity>
            }
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        federationName: {
            marginHorizontal: theme.spacing.sm,
        },
        image: {
            height: 20,
            width: 20,
            resizeMode: 'contain',
        },
    })

export default SelectedFederationHeader
