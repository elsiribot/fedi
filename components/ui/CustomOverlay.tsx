import { Button, Overlay, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

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
}

const CustomOverlay: React.FC<CustomOverlayProps> = ({
    onBackdropPress,
    show = false,
    contents,
}) => {
    const { theme } = useTheme()

    const { title, message, description, buttons } =
        contents as CustomOverlayContents

    const renderButtons = () => {
        return buttons.map((button: CustomOverlayButton, i: number) => {
            return (
                <Button
                    key={i}
                    containerStyle={styles(theme).buttonContainer}
                    title={button.text}
                    titleStyle={
                        button.textColor
                            ? { color: button.textColor }
                            : { color: theme.colors.white }
                    }
                    buttonStyle={
                        button.backgroundColor
                            ? { backgroundColor: button.backgroundColor }
                            : { backgroundColor: theme.colors.black }
                    }
                    onPress={button.onPress}
                />
            )
        })
    }

    return (
        <View>
            <Overlay
                isVisible={show}
                onBackdropPress={onBackdropPress}
                overlayStyle={styles(theme).overlayContainer}>
                <Text h2 h2Style={styles(theme).overlayText}>
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
            </Overlay>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        overlayContainer: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
        },
        overlayText: {
            marginTop: theme.spacing.lg,
            textAlign: 'center',
        },
        overlayDescription: {
            color: theme.colors.lightGrey,
            marginTop: theme.spacing.lg,
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
