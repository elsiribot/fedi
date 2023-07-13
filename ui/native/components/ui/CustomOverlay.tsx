import { Button, Overlay, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useRef, useState } from 'react'
import {
    Animated,
    StyleSheet,
    View,
    Easing,
    Platform,
    LayoutChangeEvent,
} from 'react-native'

import KeyboardAwareWrapper from './KeyboardAwareWrapper'

type CustomOverlayButton = {
    text: string
    primary?: boolean
    disabled?: boolean
    onPress: () => void
}

export type CustomOverlayContents = {
    title: string
    message?: string | null
    description?: string | null
    body?: React.ReactNode | null
    buttons?: CustomOverlayButton[]
}

type CustomOverlayProps = {
    onBackdropPress?: () => void
    show?: boolean
    contents: CustomOverlayContents | null
    loading?: boolean
}

const CustomOverlay: React.FC<CustomOverlayProps> = ({
    onBackdropPress,
    show = false,
    contents,
    loading,
}) => {
    const { theme } = useTheme()
    const [overlayHeight, setOverlayHeight] = useState(0)
    const animatedTranslateY = useRef(new Animated.Value(0)).current

    const {
        title,
        message = null,
        description = null,
        body = null,
        buttons = [],
    } = contents as CustomOverlayContents

    // Animate overlay in and out
    useEffect(() => {
        if (!overlayHeight) return
        Animated.timing(animatedTranslateY, {
            toValue: show ? 0 : overlayHeight,
            duration: 200,
            delay: show ? 150 : 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
        }).start()
    }, [show, animatedTranslateY, overlayHeight])

    // Set height whenever overlay layout changes.
    const handleOverlayLayout = (event: LayoutChangeEvent) => {
        const height = event.nativeEvent.layout.height
        if (!overlayHeight) {
            // On initial height report, immediately set height without animation.
            animatedTranslateY.setValue(height)
        }
        setOverlayHeight(height)
    }

    const renderButtons = () => {
        return buttons.map((button: CustomOverlayButton, i: number) => {
            return (
                <Button
                    key={i}
                    containerStyle={styles(theme).buttonContainer}
                    title={button.text}
                    titleStyle={{
                        color: button.primary
                            ? theme.colors.secondary
                            : theme.colors.primary,
                    }}
                    buttonStyle={{
                        backgroundColor: button.primary
                            ? theme.colors.primary
                            : theme.colors.secondary,
                    }}
                    loadingProps={{
                        color: button.primary
                            ? theme.colors.secondary
                            : theme.colors.primary,
                    }}
                    loading={loading ? button.primary : false}
                    disabled={loading ? true : button.disabled}
                    onPress={button.onPress}
                />
            )
        })
    }

    return (
        <Overlay
            isVisible={show}
            onBackdropPress={onBackdropPress}
            overlayStyle={styles(theme).overlayContainer}
            animationType="fade">
            <Animated.View
                onLayout={handleOverlayLayout}
                style={{
                    ...styles(theme).overlayContents,
                    transform: [{ translateY: animatedTranslateY }],
                }}>
                <KeyboardAwareWrapper>
                    <Text medium style={styles(theme).overlayTitle}>
                        {title}
                    </Text>
                    {message && (
                        <Text h1 h1Style={styles(theme).overlayText}>
                            {message}
                        </Text>
                    )}
                    {description && (
                        <Text style={styles(theme).overlayDescription}>
                            {description}
                        </Text>
                    )}
                    {body}
                    {buttons?.length > 0 && (
                        <View style={styles(theme).overlayButtonView}>
                            {renderButtons()}
                        </View>
                    )}
                </KeyboardAwareWrapper>
            </Animated.View>
        </Overlay>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        overlayContainer: {
            // Undo all overlay styling, overlayContents will handle styling
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 0,
            backgroundColor: 'transparent',
            shadowColor: 'transparent',
        },
        overlayContents: {
            position: 'relative',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingVertical: theme.spacing.xl,
            paddingHorizontal: theme.spacing.md,
            backgroundColor: theme.colors.white,
            ...Platform.select({
                android: {
                    elevation: 2,
                },
                default: {
                    shadowColor: 'rgba(0, 0, 0, .3)',
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 4,
                },
            }),
        },
        overlayTitle: {
            textAlign: 'center',
        },
        overlayText: {
            marginTop: theme.spacing.lg,
            textAlign: 'center',
        },
        overlayDescription: {
            color: theme.colors.lightGrey,
            textAlign: 'center',
        },
        overlayButtonView: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginVertical: theme.spacing.sm,
        },
        buttonContainer: {
            marginVertical: theme.spacing.lg,
            marginHorizontal: theme.spacing.sm,
            flex: 1,
            borderWidth: 1,
        },
    })

export default CustomOverlay
