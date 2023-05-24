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

type CustomOverlayButton = {
    text: string
    textColor?: string
    backgroundColor?: string
    onPress: () => void
}

export type CustomOverlayContents = {
    title: string
    message: string
    description?: string
    buttons: CustomOverlayButton[]
}

type CustomOverlayProps = {
    onBackdropPress?: () => void
    show?: boolean
    contents: CustomOverlayContents | null
    loading: boolean
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

    const { title, message, description, buttons } =
        contents as CustomOverlayContents

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
                    titleStyle={[
                        button.textColor
                            ? { color: button.textColor }
                            : { color: theme.colors.white },
                    ]}
                    buttonStyle={
                        button.backgroundColor
                            ? { backgroundColor: button.backgroundColor }
                            : { backgroundColor: theme.colors.black }
                    }
                    loadingProps={{
                        color: button.backgroundColor
                            ? theme.colors.primary
                            : theme.colors.secondary,
                    }}
                    onPress={button.onPress}
                    loading={loading}
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
                <Text medium style={styles(theme).overlayTitle}>
                    {title}
                </Text>
                <Text h1 h1Style={styles(theme).overlayText}>
                    {message}
                </Text>
                {description && (
                    <Text style={styles(theme).overlayDescription}>
                        {description}
                    </Text>
                )}
                <View style={styles(theme).overlayButtonView}>
                    {renderButtons()}
                </View>
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
            paddingTop: theme.spacing.xl,
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
            margin: theme.spacing.sm,
        },
        buttonContainer: {
            marginVertical: theme.spacing.lg,
            marginHorizontal: theme.spacing.sm,
            flex: 1,
            borderWidth: 1,
        },
    })

export default CustomOverlay
