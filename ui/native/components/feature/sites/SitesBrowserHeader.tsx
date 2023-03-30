import { useNavigation } from '@react-navigation/native'
import { Theme, useTheme } from '@rneui/themed'
import React, { MutableRefObject } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import WebView from 'react-native-webview'

import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

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
                        <SvgImage size={SvgImageSize.md} name="ChevronLeft" />
                    </Pressable>
                    <Pressable
                        onPress={() => webViewRef.current.goForward()}
                        hitSlop={10}
                        style={[
                            styles(theme).rightArrow,
                            styles(theme).padded,
                        ]}>
                        <SvgImage size={SvgImageSize.md} name="ChevronRight" />
                    </Pressable>
                </View>
            }
            headerRight={
                <Pressable
                    style={styles(theme).padded}
                    hitSlop={10}
                    onPress={() => navigation.goBack()}>
                    <SvgImage size={SvgImageSize.md} name="Close" />
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
