import { Text, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import HoloGradient, { HoloLevels } from './HoloGradient'

/*
    This is a custom Avatar capable of holo background with
    combined with a title text since the React Native Elements
    Avatar component does not support this
*/

enum AvatarSize {
    sm = 'sm',
    lg = 'lg',
}

type HoloAvatarProps = {
    size?: AvatarSize
    title: string
}

const HoloAvatar: React.FC<HoloAvatarProps> = ({
    size = AvatarSize.sm,
    title,
}: HoloAvatarProps) => {
    const { theme } = useTheme()

    const customSize =
        size === AvatarSize.sm
            ? theme.sizes.smallAvatar
            : theme.sizes.largeAvatar
    const height = customSize
    const width = customSize
    const mergedContainerStyle = [
        styles.container,
        {
            height,
            width,
            borderRadius: customSize * 0.5,
        },
    ]

    return (
        <View style={mergedContainerStyle}>
            <HoloGradient rounded size={customSize} level={HoloLevels._600} />
            <Text
                bold
                tiny={size === AvatarSize.sm}
                h2={size === AvatarSize.lg}
                style={styles.text}>
                {title}
            </Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        position: 'absolute',
    },
})

export default HoloAvatar
