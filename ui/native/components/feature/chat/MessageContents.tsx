import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import {
    Linking,
    StyleProp,
    StyleSheet,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native'
import Hyperlink from 'react-native-hyperlink'

import { Group } from '../../../types'
import EmbeddedJoinGroupButton from './EmbeddedJoinGroupButton'

type MessageContentsProps = {
    content: string
    sentByMe: boolean
    textStyles: StyleProp<ViewStyle | TextStyle>[]
}

const MessageContents: React.FC<MessageContentsProps> = ({
    content,
    sentByMe,
    textStyles,
}: MessageContentsProps) => {
    const { theme } = useTheme()

    // Check if there are any group invite codes in the message like this
    //      fedi:group:uuid_generated_on_group_creation:::
    // this group invite scheme was updated to add 3 trailing colons for more
    // reliable extraction of the code from a message, previously the format was:
    //      fedi:group:uuid_generated_on_group_creation

    // here we try to detect the new format first, then fallback to checking for
    // the old format...
    let regex = /fedi:group:[^\s\n]*:::/g
    let groupCodeMatches: string[] | null = content.match(regex)

    if (groupCodeMatches === null) {
        // loosen the regex here in case there is an old group code
        regex = /fedi:group:[^\s\n]*/g
        groupCodeMatches = content.match(regex)
    }

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
                if (index + 1 === groupCodeMatches?.length) {
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
                                selectable
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
            <Hyperlink
                linkStyle={
                    sentByMe
                        ? styles(theme).outgoingLinkedText
                        : styles(theme).incomingLinkedText
                }
                onPress={url => {
                    console.debug('url', url)
                    Linking.openURL(url)
                }}>
                <Text caption medium style={textStyles} selectable>
                    {content}
                </Text>
            </Hyperlink>
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
        incomingLinkedText: {
            textDecorationLine: 'underline',
            color: theme.colors.blue,
        },
        outgoingLinkedText: {
            textDecorationLine: 'underline',
            color: theme.colors.primary,
        },
    })

export default MessageContents
