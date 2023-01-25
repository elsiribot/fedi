import { useNavigation } from '@react-navigation/native'
import { Icon } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { NavigationHook } from '../../../types/navigation'

import Header from '../../ui/Header'

type SitesHeaderProps = {
    webViewRef?: any
}

const SitesHeader: React.FC<SitesHeaderProps> = ({ webViewRef }) => {
    const navigation = useNavigation<NavigationHook>()

    return (
        <Header
            leftContainerStyle={{ flex: 3 }}
            headerLeft={
                <View style={styles.container}>
                    <View style={styles.row}>
                        <Pressable
                            onPress={() => webViewRef.current.goBack()}
                            style={styles.arrow}>
                            <Icon name={'angle-left'} type="font-awesome" />
                        </Pressable>
                        <Pressable
                            onPress={() => webViewRef.current.goForward()}
                            style={styles.arrow}>
                            <Icon name={'angle-right'} type="font-awesome" />
                        </Pressable>
                    </View>
                </View>
            }
            headerRight={
                <Pressable onPress={() => navigation.goBack()}>
                    <Icon name={'close'} />
                </Pressable>
            }
        />
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    arrow: {
        paddingHorizontal: 15,
    },
})

export default SitesHeader
