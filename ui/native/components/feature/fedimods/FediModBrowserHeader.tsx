import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { MutableRefObject, useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import WebView from 'react-native-webview'

import { setAddressOverlayOpen } from '@fedi/common/redux'

import { useAppDispatch } from '../../../state/hooks'
import Flex from '../../ui/Flex'
import { PressableIcon } from '../../ui/PressableIcon'

type FediModBrowserHeaderProps = {
    webViewRef: MutableRefObject<WebView>
    isBrowserLoading: boolean
    browserLoadProgress: number
    currentUrl: string
}

const FediModBrowserHeader: React.FC<FediModBrowserHeaderProps> = ({
    webViewRef,
    isBrowserLoading,
    currentUrl,
    browserLoadProgress,
}) => {
    const { theme } = useTheme()
    const navigation = useNavigation()
    const dispatch = useAppDispatch()
    const animatedProgress = useRef(new Animated.Value(0)).current
    const animatedOpacity = useRef(new Animated.Value(1)).current
    const [addressWidth, setAddressWidth] = useState(0)

    const style = styles(theme)

    useEffect(() => {
        Animated.timing(animatedProgress, {
            toValue: browserLoadProgress * addressWidth,
            duration: 200,
            useNativeDriver: false,
        }).start()
    }, [browserLoadProgress, animatedProgress, addressWidth])

    useEffect(() => {
        Animated.timing(animatedOpacity, {
            toValue: isBrowserLoading ? 1 : 0,
            duration: 200,
            delay: 400,
            useNativeDriver: false,
        }).start()
    }, [isBrowserLoading, animatedOpacity])

    return (
        <Flex
            row
            align="center"
            gap="sm"
            shrink
            basis={false}
            style={style.container}>
            <Flex row gap="xs">
                <PressableIcon
                    svgName="ChevronLeft"
                    hitSlop={10}
                    onPress={() => webViewRef.current.goBack()}
                />
                <PressableIcon
                    svgName="ChevronRight"
                    hitSlop={10}
                    onPress={() => webViewRef.current.goForward()}
                />
            </Flex>
            <Pressable
                style={[style.addressInput]}
                disabled={isBrowserLoading && browserLoadProgress < 1}
                onPress={() => dispatch(setAddressOverlayOpen(true))}
                onLayout={e => setAddressWidth(e.nativeEvent.layout.width)}>
                <Text>{new URL(currentUrl).hostname}</Text>
                <Animated.View
                    style={{
                        ...style.progressBar,
                        opacity: animatedOpacity,
                        width: animatedProgress,
                    }}
                />
            </Pressable>
            <Flex row gap="xs">
                <PressableIcon
                    svgName="Close"
                    hitSlop={10}
                    onPress={() => navigation.goBack()}
                />
            </Flex>
        </Flex>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.sm,
            borderTopWidth: 1,
            borderTopColor: theme.colors.lightGrey,
        },
        addressInput: {
            backgroundColor: theme.colors.extraLightGrey,
            flex: 1,
            borderRadius: 8,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
        },
        progressBar: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: theme.colors.blue,
        },
    })

export default FediModBrowserHeader
