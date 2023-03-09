import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native'

import { Group } from '../../../types'
import EmbeddedJoinGroupButton from './EmbeddedJoinGroupButton'

type MessageContentsProps = {
    content: string
    textStyles: StyleProp<ViewStyle | TextStyle>[]
}

const MessageContents: React.FC<MessageContentsProps> = ({
    content,
    textStyles,
}: MessageContentsProps) => {
    const { theme } = useTheme()

    // Check if there are any group invite codes in the message
    const regex = /fedi:group:[^\s\n]*:::/g
    const groupCodeMatches: string[] | null = content.match(regex)

    // groupCodeMatches is null if no group invite code is found
    if (groupCodeMatches) {
        // construct an array that identifies text content from group invite
        // code strings as separate renderable elements
        const messageElements: string[] = []

        // there may be multiple group invite codes so this makes sure
        // to convert each of them to a embedded button
        groupCodeMatches.reduce(
            (contentString: string, match: string, index: number) => {
                const splitText = contentString.split(match)
                const textBeforeCode = splitText[0]
                const textAfterCode = splitText[1]

                // push any preceding text in first
                messageElements.push(textBeforeCode)
                // then push the group invite code
                messageElements.push(match)

                // only push subsequent text if this is the last invite code
                if (index + 1 === groupCodeMatches.length) {
                    messageElements.push(textAfterCode)
                }

                // otherwise return the remaining string text for next pass
                return textAfterCode
            },
            content,
        )

        return (
            <View>
                {messageElements.map((m: string, i: number) => {
                    const isGroupCode = m.startsWith('fedi:group:')
                    if (isGroupCode) {
                        const group: Group = Group.decodeInvitationLink(m)
                        return (
                            <EmbeddedJoinGroupButton
                                key={`mi-t-${i}`}
                                group={group}
                            />
                        )
                    } else if (m) {
                        return (
                            <Text
                                key={`mi-t-${i}`}
                                caption
                                medium
                                style={[
                                    ...textStyles,
                                    i !== 0 ? styles(theme).topPaddedText : {},
                                    i !== messageElements.length - 1
                                        ? styles(theme).bottomPaddedText
                                        : {},
                                ]}>
                                {m.trim()}
                            </Text>
                        )
                    } else {
                        return null
                    }
                })}
            </View>
        )
    } else {
        // otherwise just render text normally
        return (
            <Text caption medium style={textStyles}>
                {content}
            </Text>
        )
    }
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        topPaddedText: {
            marginTop: theme.spacing.sm,
        },
        bottomPaddedText: {
            marginBottom: theme.spacing.sm,
        },
    })

export default MessageContents
