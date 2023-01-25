import { useNavigation } from '@react-navigation/native'
import { Icon, Theme, useTheme } from '@rneui/themed'
import React, { MutableRefObject } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import WebView from 'react-native-webview'

import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'

type SitesHeaderProps = {
    webViewRef: MutableRefObject<WebView>
}

const SitesHeader: React.FC<SitesHeaderProps> = ({ webViewRef }) => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()

    return (
        <Header
            leftContainerStyle={{ flex: 3 }}
            headerLeft={
                <View style={styles(theme).container}>
                    <Pressable
                        onPress={() => webViewRef.current.goBack()}
                        style={[styles(theme).arrow, styles(theme).padded]}>
                        <Icon name={'angle-left'} type="font-awesome" />
                    </Pressable>
                    <Pressable
                        onPress={() => webViewRef.current.goForward()}
                        style={[styles(theme).arrow, styles(theme).padded]}>
                        <Icon name={'angle-right'} type="font-awesome" />
                    </Pressable>
                </View>
            }
            headerRight={
                <Pressable
                    style={styles(theme).padded}
                    onPress={() => navigation.goBack()}>
                    <Icon name={'close'} />
                </Pressable>
            }
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            width: '100%',
            flexDirection: 'row',
        },
        arrow: {
            paddingHorizontal: 15,
        },
        padded: {
            paddingVertical: theme.spacing.sm,
            backgroundColor: 'lightblue',
        },
    })

export default SitesHeader
