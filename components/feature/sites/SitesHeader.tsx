import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Icon } from '@rneui/themed'

import Header from '../../ui/Header'

const LnInvoiceHeader: React.FC<{}> = () => {
    const navigation = useNavigation()

    return (
        <Header
            leftContainerStyle={{ flex: 3 }}
            headerLeft={
                <View style={styles.container}>
                    <View style={styles.row}>
                        <Pressable
                            onPress={() => console.log('back')}
                            style={styles.arrow}>
                            <Icon name={'angle-left'} type="font-awesome" />
                        </Pressable>
                        <Pressable
                            onPress={() => console.log('forward')}
                            style={styles.arrow}>
                            <Icon name={'angle-right'} type="font-awesome" />
                        </Pressable>
                    </View>
                </View>
            }
            headerRight={
                <Pressable onPress={() => navigation.navigate('Home')}>
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

export default LnInvoiceHeader
