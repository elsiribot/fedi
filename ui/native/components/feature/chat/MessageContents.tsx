import Clipboard from '@react-native-clipboard/clipboard'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { ReactNode, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Linking,
    StyleProp,
    StyleSheet,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native'
import Hyperlink from 'react-native-hyperlink'

import { useToast } from '@fedi/common/hooks/toast'
import { makeLog } from '@fedi/common/utils/log'
import {
    decodeFediMatrixRoomUri,
    splitEveryoneRuns,
    splitHtmlRuns,
} from '@fedi/common/utils/matrix'

import EmbeddedJoinGroupButton from './EmbeddedJoinGroupButton'

const log = makeLog('MessageContents')

type MessageContentsProps = {
    content: string
    sentByMe: boolean
    textStyles: StyleProp<ViewStyle | TextStyle>[]
    onMentionPress?: (userId: string) => void
    currentUserId?: string
}

const MessageContents: React.FC<MessageContentsProps> = ({
    content,
    sentByMe,
    textStyles,
    onMentionPress,
    currentUserId,
}: MessageContentsProps) => {
    const { theme } = useTheme()
    const toast = useToast()
    const { t } = useTranslation()

    const handleLinkPress = useCallback(
        (url: string) => {
            // support tapping matrix.to user links as mentions
            if (onMentionPress) {
                try {
                    const hashIndex = url.indexOf('#/')
                    if (url.includes('matrix.to') && hashIndex !== -1) {
                        const after = url.slice(hashIndex + 2)
                        const decoded = decodeURIComponent(after)

                        // User mention: "@localpart:server"
                        const userMatch = decoded.match(/^@[^:/?#]+:[^/?#]+/)
                        if (userMatch) {
                            const mentionedId = userMatch[0]
                            // swallow taps on self-mentions (don’t open action modal)
                            if (currentUserId && mentionedId === currentUserId)
                                return
                            onMentionPress(mentionedId)
                            return
                        }

                        // Rooms: !roomId:server or #alias:server
                        const roomIdMatch = decoded.match(/^![^:/?#]+:[^/?#]+/)
                        const roomAliasMatch =
                            decoded.match(/^#[^:/?#]+:[^/?#]+/)
                        if (roomIdMatch || roomAliasMatch) {
                            Linking.openURL(url)
                            return
                        }
                    }
                } catch (err) {
                    log.error("Couldn't tap link", { url, err })
                }
            }
            log.debug('url', url)
            Linking.openURL(url)
        },
        [onMentionPress, currentUserId],
    )

    const handleLinkLongPress = useCallback(
        (url: string) => {
            Clipboard.setString(url)
            toast.show({
                content: t('phrases.copied-to-clipboard'),
                status: 'success',
            })
        },
        [toast, t],
    )

    const linkStyle = sentByMe
        ? styles(theme).outgoingLinkedText
        : styles(theme).incomingLinkedText

    // shared renderer used in both branches
    const renderRichBlock = useCallback(
        (block: string, key?: string | number, mediumWeight?: boolean) => {
            const hasHtml =
                /<a\s+href="/i.test(block) || /<br\s*\/?>/i.test(block)
            if (!hasHtml) {
                const parts = splitEveryoneRuns(block.trim())
                return (
                    <Text
                        key={key ?? 'plain'}
                        caption
                        {...(mediumWeight ? { medium: true } : {})}
                        style={[...textStyles, styles(theme).consistentText]}>
                        {parts.map((p, idx) =>
                            p.type === 'everyone' ? (
                                <Text
                                    key={`ev-${idx}`}
                                    caption
                                    {...(mediumWeight ? { medium: true } : {})}
                                    style={[
                                        linkStyle,
                                        styles(theme).consistentText,
                                    ]}>
                                    {p.text}
                                </Text>
                            ) : (
                                <React.Fragment key={`tx-${idx}`}>
                                    {p.text}
                                </React.Fragment>
                            ),
                        )}
                    </Text>
                )
            }

            const runs = splitHtmlRuns(block)
            return (
                <Text
                    key={key ?? 'rich'}
                    caption
                    {...(mediumWeight ? { medium: true } : {})}
                    style={[...textStyles, styles(theme).consistentText]}>
                    {runs.flatMap((r, idx) => {
                        if (r.type === 'link' && r.href) {
                            // detect Matrix user mention for styling/behavior
                            let isSelf = false
                            try {
                                const hashIndex = r.href.indexOf('#/')
                                if (
                                    r.href.includes('matrix.to') &&
                                    hashIndex !== -1
                                ) {
                                    const after = r.href.slice(hashIndex + 2)
                                    const decoded = decodeURIComponent(after)
                                    const userMatch =
                                        // Match a Matrix user ID at start of string: "@localpart:server" (stops before '/', '?', '#')
                                        decoded.match(/^@[^:/?#]+:[^/?#]+/)
                                    if (userMatch) {
                                        isSelf =
                                            !!currentUserId &&
                                            userMatch[0] === currentUserId
                                    }
                                }
                            } catch (err) {
                                log.warn(
                                    'mention-highlight: failed to parse matrix.to user link; skipping self-highlight',
                                    {
                                        href: r.href,
                                        err,
                                    },
                                )
                            }

                            return (
                                <Text
                                    key={`lnk-${idx}`}
                                    caption
                                    {...(mediumWeight ? { medium: true } : {})}
                                    style={[
                                        linkStyle,
                                        styles(theme).consistentText,
                                        isSelf
                                            ? styles(theme).selfMention
                                            : null,
                                    ]}
                                    suppressHighlighting
                                    onPress={
                                        isSelf
                                            ? undefined
                                            : () => handleLinkPress(r.href)
                                    }
                                    onLongPress={() =>
                                        handleLinkLongPress(r.href)
                                    }>
                                    {r.text}
                                </Text>
                            )
                        }

                        const parts = splitEveryoneRuns(r.text)
                        return parts.map((p, j) =>
                            p.type === 'everyone' ? (
                                <Text
                                    key={`ev-${idx}-${j}`}
                                    caption
                                    {...(mediumWeight ? { medium: true } : {})}
                                    style={[
                                        linkStyle,
                                        styles(theme).consistentText,
                                    ]}>
                                    {p.text}
                                </Text>
                            ) : (
                                <React.Fragment key={`tx-${idx}-${j}`}>
                                    {p.text}
                                </React.Fragment>
                            ),
                        )
                    })}
                </Text>
            )
        },
        [
            handleLinkLongPress,
            handleLinkPress,
            linkStyle,
            textStyles,
            theme,
            currentUserId,
        ],
    )

    let text: ReactNode = null
    // Check if there are any group invite codes in the message like this
    //      fedi:room:uuid_generated_on_group_creation:::
    const regex = /fedi:room:[^\s\n]*:::/g
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
                if (index + 1 === groupCodeMatches?.length) {
                    messageElements.push(textAfterCode)
                }

                // otherwise return the remaining string text for next pass
                return textAfterCode
            },
            content,
        )

        text = (
            <View>
                {messageElements.map((m: string, i: number) => {
                    if (!m) return null
                    const isMatrixChatGroupCode = m.startsWith('fedi:room:')
                    if (isMatrixChatGroupCode) {
                        const groupId = decodeFediMatrixRoomUri(m)
                        return (
                            <EmbeddedJoinGroupButton
                                key={`mi-t-${i}`}
                                groupId={groupId}
                            />
                        )
                    }
                    return (
                        <Hyperlink
                            key={`mi-t-${i}`}
                            linkStyle={linkStyle}
                            onPress={handleLinkPress}
                            onLongPress={handleLinkLongPress}>
                            {renderRichBlock(m, `blk-${i}`)}
                        </Hyperlink>
                    )
                })}
            </View>
        )
    } else {
        // otherwise just render text normally with consistent container
        text = (
            <View style={{ minHeight: 20 }}>
                {renderRichBlock(content, 'only', true)}
            </View>
        )
    }

    return (
        <Hyperlink
            linkStyle={
                sentByMe
                    ? styles(theme).outgoingLinkedText
                    : styles(theme).incomingLinkedText
            }
            onPress={handleLinkPress}
            onLongPress={handleLinkLongPress}>
            {text}
        </Hyperlink>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        topPaddedText: {
            marginTop: theme.spacing.sm,
        },
        bottomPaddedText: {
            marginBottom: theme.spacing.sm,
        },
        consistentText: {
            marginVertical: theme.spacing.xs / 2,
        },
        incomingLinkedText: {
            textDecorationLine: 'underline',
            color: theme.colors.blue,
        },
        outgoingLinkedText: {
            textDecorationLine: 'underline',
            color: theme.colors.secondary,
        },
        selfMention: {
            fontWeight: '700',
        },
    })

export default MessageContents
