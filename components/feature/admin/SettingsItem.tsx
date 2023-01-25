import { Icon, Text, Theme, useTheme } from '@rneui/themed'
import {
    GestureResponderEvent,
    ImageSourcePropType,
    Pressable,
    StyleSheet,
} from 'react-native'

type SettingsItemProps = {
    disabled?: boolean
    imageSource: ImageSourcePropType
    label: string
    onPress: (event: GestureResponderEvent) => void
}

const SettingsItem = ({
    disabled = false,
    imageSource,
    label,
    onPress,
}: SettingsItemProps) => {
    const { theme } = useTheme()
    return (
        <Pressable
            style={[styles(theme).container, disabled ? { opacity: 0.25 } : {}]}
            onPress={disabled ? () => {} : onPress}>
            {imageSource}
            <Text style={styles(theme).label}>{label}</Text>
            <Icon
                name={'angle-right'}
                type={'font-awesome'}
                color={theme.colors.primaryLight}
                containerStyle={styles(theme).icon}
            />
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: theme.spacing.md,
            width: '100%',
        },
        image: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        label: {
            flexGrow: 1,
            color: theme.colors.primary,
            paddingHorizontal: theme.spacing.md,
        },
        icon: {
            alignSelf: 'flex-end',
        },
    })

export default SettingsItem
