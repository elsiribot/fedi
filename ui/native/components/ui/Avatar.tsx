import { Text, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { getIdentityColors } from '@fedi/common/utils/color'

import SvgImage, { SvgImageName, SvgImageSize } from './SvgImage'

/*
    This is a custom Avatar capable of holo background with
    combined with a title text since the React Native Elements
    Avatar component does not support this
*/

export enum AvatarSize {
    sm = 'sm',
    md = 'md',
    lg = 'lg',
}

const imageSizeMapping = {
    [AvatarSize.sm]: SvgImageSize.xs,
    [AvatarSize.md]: SvgImageSize.sm,
    [AvatarSize.lg]: SvgImageSize.md,
}

type HoloAvatarProps = {
    size?: AvatarSize
    id: string | number
    title: string
    icon?: SvgImageName
}

const Avatar: React.FC<HoloAvatarProps> = ({
    size = AvatarSize.sm,
    id,
    title,
    icon,
}: HoloAvatarProps) => {
    const { theme } = useTheme()
    const [bgColor, textColor] = getIdentityColors(id)

    const customSize =
        size === AvatarSize.sm
            ? theme.sizes.smallAvatar
            : size === AvatarSize.md
            ? theme.sizes.mediumAvatar
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
        { backgroundColor: bgColor },
    ]
    const mergedTextStyle = [styles.text, { color: textColor }]

    return (
        <View style={mergedContainerStyle}>
            {icon ? (
                <SvgImage
                    name={icon}
                    size={imageSizeMapping[size]}
                    color={textColor}
                />
            ) : (
                <Text
                    bold
                    tiny={size === AvatarSize.sm}
                    h2={size === AvatarSize.lg}
                    style={mergedTextStyle}>
                    {title}
                </Text>
            )}
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

export default Avatar
