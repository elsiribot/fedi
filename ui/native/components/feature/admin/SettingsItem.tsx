import { Text, Theme, useTheme } from '@rneui/themed'
import {
    ActivityIndicator,
    GestureResponderEvent,
    StyleSheet,
} from 'react-native'

import * as Svgs from '../../../assets/images/svgs'
import { Pressable } from '../../ui/Pressable'
import SvgImage from '../../ui/SvgImage'

type SettingsItemProps = {
    disabled?: boolean
    image: React.ReactNode
    label: string
    action?: React.ReactNode
    actionIcon?: keyof typeof Svgs
    isLoading?: boolean
    onPress: (event: GestureResponderEvent) => void
}

const SettingsItem = ({
    disabled = false,
    image,
    label,
    action,
    actionIcon = 'ChevronRight',
    isLoading = false,
    onPress,
}: SettingsItemProps) => {
    const { theme } = useTheme()
    return (
        <Pressable
            containerStyle={[
                styles(theme).container,
                disabled ? { opacity: 0.25 } : {},
            ]}
            onPress={disabled ? undefined : onPress}>
            {image}
            <Text style={styles(theme).label}>{label}</Text>
            {isLoading ? (
                <ActivityIndicator size={theme.sizes.sm} />
            ) : (
                action || (
                    <SvgImage
                        name={actionIcon}
                        color={theme.colors.primaryLight}
                    />
                )
            )}
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: theme.spacing.md,
            // paddingHorizontal: 0,
            width: '100%',
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

export default SettingsItem
