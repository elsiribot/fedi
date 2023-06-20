import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { MutableRefObject } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import WebView from 'react-native-webview'

import { FediMod } from '@fedi/common/types'

import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type SitesBrowserHeaderProps = {
    webViewRef: MutableRefObject<WebView>
    site: FediMod
}

const SitesBrowserHeader: React.FC<SitesBrowserHeaderProps> = ({
    webViewRef,
    site,
}) => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()

    return (
        <Header
            containerStyle={{ borderBottomColor: theme.colors.lightGrey }}
            headerLeft={
                <View style={styles(theme).arrowsContainer}>
                    <Pressable
                        onPress={() => webViewRef.current.goBack()}
                        hitSlop={10}
                        style={styles(theme).arrow}>
                        <SvgImage size={SvgImageSize.sm} name="ChevronLeft" />
                    </Pressable>
                    <Pressable
                        onPress={() => webViewRef.current.goForward()}
                        hitSlop={10}
                        style={[styles(theme).arrow, styles(theme).rightArrow]}>
                        <SvgImage size={SvgImageSize.sm} name="ChevronRight" />
                    </Pressable>
                </View>
            }
            headerCenter={
                <View style={styles(theme).titleContainer}>
                    <Text
                        caption
                        medium
                        numberOfLines={1}
                        style={styles(theme).titleText}>
                        {site.title}
                    </Text>
                </View>
            }
            headerRight={
                <Pressable
                    style={styles(theme).close}
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
        arrowsContainer: {
            flexDirection: 'row',
        },
        arrow: {
            paddingVertical: theme.spacing.lg,
        },
        rightArrow: {
            marginLeft: theme.spacing.lg,
        },
        titleContainer: {
            flex: 1,
            paddingHorizontal: theme.spacing.md,
        },
        titleText: {
            width: '100%',
            textAlign: 'center',
            lineHeight: 24,
        },
        close: {
            paddingVertical: theme.spacing.md,
        },
    })

export default SitesBrowserHeader
