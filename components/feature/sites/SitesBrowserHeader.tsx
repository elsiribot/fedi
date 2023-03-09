import { useNavigation } from '@react-navigation/native'
import { Icon, Theme, useTheme } from '@rneui/themed'
import React, { MutableRefObject } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import WebView from 'react-native-webview'

import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'

type SitesBrowserHeaderProps = {
    webViewRef: MutableRefObject<WebView>
}

const SitesBrowserHeader: React.FC<SitesBrowserHeaderProps> = ({
    webViewRef,
}) => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()

    return (
        <Header
            leftContainerStyle={{ flex: 3 }}
            headerLeft={
                <View style={styles(theme).container}>
                    <Pressable
                        onPress={() => webViewRef.current.goBack()}
                        hitSlop={10}
                        style={styles(theme).padded}>
                        <Icon
                            size={30}
                            name={'angle-left'}
                            type="font-awesome"
                        />
                    </Pressable>
                    <Pressable
                        onPress={() => webViewRef.current.goForward()}
                        hitSlop={10}
                        style={[
                            styles(theme).rightArrow,
                            styles(theme).padded,
                        ]}>
                        <Icon
                            size={30}
                            name={'angle-right'}
                            type="font-awesome"
                        />
                    </Pressable>
                </View>
            }
            headerRight={
                <Pressable
                    style={styles(theme).padded}
                    hitSlop={10}
                    onPress={() => navigation.goBack()}>
                    <Icon size={30} name={'close'} />
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
        rightArrow: {
            paddingLeft: 100,
        },
        padded: {
            paddingVertical: theme.spacing.lg,
        },
    })

export default SitesBrowserHeader
