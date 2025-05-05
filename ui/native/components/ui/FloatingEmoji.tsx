import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet } from 'react-native'

import { hexToRgba } from '@fedi/common/utils/color'

import Flex from './Flex'

/*
    UI Component: FloatingEmoji

    Renders the provided string into a rounded floating
    container intended for 1-character emojis. Though this
    is not enforced in the component

    size can be any number and will render as the font size
    of the emoji

    <FloatingEmoji emoji="🌎" size={20}/>
*/

type FloatingEmojiProps = {
    emoji: string
    size: number
}

const FloatingEmoji: React.FC<FloatingEmojiProps> = ({
    emoji,
    size,
}: FloatingEmojiProps) => {
    const { theme } = useTheme()

    const style = styles(theme)
    const height = size * 2
    const width = height
    const borderRadius = height * 0.5
    const fontSize = size

    return (
        <Flex
            center
            style={[
                style.container,
                {
                    height,
                    width,
                    borderRadius,
                },
            ]}>
            <Text style={{ fontSize }} adjustsFontSizeToFit>
                {emoji}
            </Text>
        </Flex>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            backgroundColor: theme.colors.secondary,
            shadowOffset: { width: 0, height: 16 },
            shadowColor: hexToRgba(theme.colors.blueDropShadow, 0.16),
            shadowRadius: 11,
            shadowOpacity: 1,
            elevation: 11,
        },
    })

export default FloatingEmoji
