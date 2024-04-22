import { Text, Theme, useTheme } from '@rneui/themed'
import {
    ActivityIndicator,
    ColorValue,
    GestureResponderEvent,
    Pressable,
    StyleSheet,
} from 'react-native'

type ChatUserActionProps = {
    disabled?: boolean
    leftIcon: React.ReactNode
    label: string
    action?: React.ReactNode
    onPress: (event: GestureResponderEvent) => void
    active?: boolean
    rightIcon?: React.ReactNode
    isLoading?: boolean
    labelColor?: ColorValue
}

const ChatUserAction = ({
    disabled = false,
    active = false,
    leftIcon,
    label,
    labelColor,
    rightIcon,
    isLoading,
    onPress,
}: ChatUserActionProps) => {
    const { theme } = useTheme()
    return (
        <Pressable
            style={({ pressed }) => [
                styles(theme).container,
                disabled ? { opacity: 0.25 } : {},
                pressed && !disabled
                    ? { backgroundColor: theme.colors.primary05 }
                    : {},
            ]}
            onPress={disabled ? undefined : onPress}>
            <>{leftIcon}</>
            <Text
                bold
                style={[
                    styles(theme).label,
                    active ? { color: theme.colors.blue } : {},
                    labelColor ? { color: labelColor } : {},
                ]}>
                {label}
            </Text>
            <>{rightIcon}</>
            {isLoading && <ActivityIndicator size={24} />}
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.sm,
            width: '100%',
            borderRadius: theme.borders.defaultRadius,
        },
        image: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        label: {
            flexGrow: 1,
            flexShrink: 1,
            color: theme.colors.primary,
            paddingHorizontal: theme.spacing.md,
        },
    })

export default ChatUserAction
