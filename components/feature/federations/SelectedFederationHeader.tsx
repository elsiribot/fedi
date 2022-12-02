import React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { Icon, Image, Text } from '@rneui/themed'
import Header from '../../ui/Header'
import { useFederationsContext } from '../../../contexts/FederationsContext'
import { Federation } from '../../../bridge'
import Images from '../../../assets/images'

export type Props = { navigation: any }

const DRAWER_NAVIGATION_ID = 'ConnectedFederationsDrawer'

const SelectedFederationHeader: React.FC<Props> = ({ navigation }: Props) => {
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
                    style={styles.container}
                    onPress={openFederationsDrawer}>
                    <Image
                        style={styles.image}
                        source={Images.FederationXIcon}
                    />
                    <Text h4 style={styles.federationName}>
                        {selectedFederation?.name}
                    </Text>
                    <Icon name={'angle-right'} type="font-awesome" />
                </TouchableOpacity>
            }
        />
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    federationName: {
        marginHorizontal: 6,
    },
    image: {
        height: 20,
        width: 20,
        resizeMode: 'contain',
    },
})

export default SelectedFederationHeader
