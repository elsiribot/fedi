import Clipboard from '@react-native-clipboard/clipboard'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { ReactNode, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Linking,
    Platform,
    StyleProp,
    StyleSheet,
    TextProps as RNTextProps,
    TextStyle,
    View,
    ViewStyle,
    Text as RNText,
} from 'react-native'
import Hyperlink from 'react-native-hyperlink'

import { useToast } from '@fedi/common/hooks/toast'
import { MatrixRoomMember } from '@fedi/common/types/matrix'
import { makeLog } from '@fedi/common/utils/log'
import {
    decodeFediMatrixRoomUri,
    splitEveryoneRuns,
    splitHtmlRuns,
    parseMentionsFromText,
} from '@fedi/common/utils/matrix'

import EmbeddedJoinGroupButton from './EmbeddedJoinGroupButton'

const log = makeLog('MessageContents')

// Android-only rendering quirk: last run after an <a> can disappear.
// Fix by appending a non-breaking-space tail and using a simpler break strategy.
const NEEDS_TAIL_FIX = Platform.OS === 'android'

type MessageContentsProps = {
    content: string
    sentByMe: boolean
    textStyles: StyleProp<ViewStyle | TextStyle>[]
    onMentionPress?: (userId: string) => void
    currentUserId?: string
    roomMembers?: MatrixRoomMember[]
}

const MessageContents: React.FC<MessageContentsProps> = ({
    content,
    sentByMe,
    textStyles,
    onMentionPress,
    currentUserId,
    roomMembers,
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

                        // Match a Matrix user ID at start of string: "@localpart:server" (stops before '/', '?', '#')
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
        (
            block: string,
            key?: string | number,
            mediumWeight?: boolean,
        ): React.ReactElement => {
            const androidTextProps: Partial<RNTextProps> = NEEDS_TAIL_FIX
                ? { textBreakStrategy: 'simple' }
                : {}
            const hasHtml =
                /<a\s+href="/i.test(block) || /<br\s*\/?>/i.test(block)

            if (!hasHtml) {
                const trimmed = block.trim()
                if (roomMembers && trimmed) {
                    try {
                        const { formattedBody } = parseMentionsFromText(
                            trimmed,
                            roomMembers,
                        )
                        if (
                            formattedBody &&
                            /<a\s+href="/i.test(formattedBody)
                        ) {
                            return renderRichBlock(
                                formattedBody,
                                key ?? 'plain-upgraded',
                                mediumWeight,
                            )
                        }
                    } catch (err) {
                        log.warn(
                            'mention-parse: failed to upgrade plain text',
                            {
                                err,
                            },
                        )
                    }
                }

                const parts = splitEveryoneRuns(trimmed)
                return (
                    <Text
                        key={key ?? 'plain'}
                        caption
                        {...(mediumWeight ? { medium: true } : {})}
                        {...androidTextProps}
                        style={[...textStyles, styles(theme).consistentText]}>
                        {parts.map((p, idx) =>
                            p.type === 'everyone' ? (
                                <RNText
                                    key={`ev-${idx}`}
                                    style={[
                                        linkStyle,
                                        styles(theme).consistentText,
                                    ]}>
                                    {p.text}
                                </RNText>
                            ) : (
                                <RNText
                                    key={`tx-${idx}`}
                                    style={[styles(theme).consistentText]}>
                                    {p.text}
                                </RNText>
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
                    {...androidTextProps}
                    style={[...textStyles, styles(theme).consistentText]}>
                    {runs.flatMap((r, idx) => {
                        if (r.type === 'link' && r.href) {
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
                                <RNText
                                    key={`ev-${idx}-${j}`}
                                    style={[
                                        linkStyle,
                                        styles(theme).consistentText,
                                    ]}>
                                    {p.text}
                                </RNText>
                            ) : (
                                <RNText
                                    key={`tx-${idx}-${j}`}
                                    style={[styles(theme).consistentText]}>
                                    {p.text}
                                </RNText>
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
            roomMembers,
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

        groupCodeMatches.reduce(
            (contentString: string, match: string, index: number) => {
                const splitText = contentString.split(match)
                const textBeforeCode = splitText[0]
                const textAfterCode = splitText[1]

                messageElements.push(textBeforeCode)
                messageElements.push(match)

                if (index + 1 === groupCodeMatches?.length) {
                    messageElements.push(textAfterCode)
                }

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
                            onLongPress={handleLinkLongPress}
                            // eslint-disable-next-line react/no-children-prop
                            children={renderRichBlock(m, `blk-${i}`)}
                        />
                    )
                })}
            </View>
        )
    } else {
        // otherwise just render text normally with consistent container
        const onlyText = renderRichBlock(content, 'only')

        text = (
            <View style={{ minHeight: 20 }}>
                <Hyperlink
                    linkStyle={linkStyle}
                    onPress={handleLinkPress}
                    onLongPress={handleLinkLongPress}
                    children={onlyText}
                />
            </View>
        )
    }

    // final render
    return <>{text}</>
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
