import { Button, Overlay, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

type OverlayProps = {
    setShow: React.Dispatch<React.SetStateAction<boolean>>
    show: boolean
    title: string
    message: string
    description?: string
    buttons: Array<any>
}

const CustomOverlay: React.FC<OverlayProps> = ({
    setShow,
    show,
    title,
    message,
    description,
    buttons,
}) => {
    const { theme } = useTheme()

    const renderButtons = () => {
        return buttons.map((button, i) => {
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
                isVisible={show || false}
                onBackdropPress={() => setShow(false)}
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
            marginTop: 20,
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
            margin: theme.spacing.sm,
            flex: 1,
        },
    })

export default CustomOverlay
