import React from 'react'

import { selectMatrixAuth, selectMatrixRoomMembers } from '@fedi/common/redux'
import { MatrixEvent } from '@fedi/common/types'
import { parseMessageText } from '@fedi/common/utils/chat'
import { makeLog } from '@fedi/common/utils/log'
import {
    isHtmlFormattedContent,
    stripReplyFromFormattedBody,
    splitHtmlRuns,
    parseMentionsFromText,
} from '@fedi/common/utils/matrix'

import { useAppSelector } from '../../hooks'
import { styled } from '../../styles'

const log = makeLog('ChatTextEvent')

interface Props {
    event: MatrixEvent<'m.text'>
}

const renderTextWithBreaks = (text: string) =>
    text.split(/\r?\n/).map((part, index, array) => (
        <React.Fragment key={index}>
            {part}
            {index !== array.length - 1 && <br />}
        </React.Fragment>
    ))

export const ChatTextEvent: React.FC<Props> = ({ event }) => {
    const content = event.content
    const selfUserId = useAppSelector(s => selectMatrixAuth(s)?.userId) || null
    const roomMembers =
        useAppSelector(s => selectMatrixRoomMembers(s, event.roomId)) || []

    // If we have formatted HTML, strip reply and render runs
    if (isHtmlFormattedContent(content)) {
        const html = stripReplyFromFormattedBody(content.formatted_body) ?? ''
        if (html.trim()) {
            const runs = splitHtmlRuns(html)
            return (
                <Formatted>
                    {runs.map((r, i) =>
                        r.type === 'link' ? (
                            <A
                                key={`lnk-${i}`}
                                href={r.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={
                                    selfUserId &&
                                    (r.href.includes(
                                        encodeURIComponent(selfUserId),
                                    ) ||
                                        r.href.includes(selfUserId))
                                        ? 'self-mention'
                                        : undefined
                                }>
                                {r.text}
                            </A>
                        ) : (
                            <React.Fragment key={`txt-${i}`}>
                                {renderTextWithBreaks(r.text)}
                            </React.Fragment>
                        ),
                    )}
                </Formatted>
            )
        }
    }

    // Plain text: upgrade mentions to HTML, then render runs
    if (content.body?.trim()) {
        try {
            const { formattedBody } = parseMentionsFromText(
                content.body,
                roomMembers,
            )
            if (formattedBody?.trim() && /<a\s/i.test(formattedBody)) {
                const runs = splitHtmlRuns(formattedBody)
                return (
                    <Formatted>
                        {runs.map((r, i) =>
                            r.type === 'link' ? (
                                <A
                                    key={`lnk-${i}`}
                                    href={r.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={
                                        selfUserId &&
                                        (r.href.includes(
                                            encodeURIComponent(selfUserId),
                                        ) ||
                                            r.href.includes(selfUserId))
                                            ? 'self-mention'
                                            : undefined
                                    }>
                                    {r.text}
                                </A>
                            ) : (
                                <React.Fragment key={`txt-${i}`}>
                                    {renderTextWithBreaks(r.text)}
                                </React.Fragment>
                            ),
                        )}
                    </Formatted>
                )
            }
        } catch (e) {
            // fall through to simple parsing below
            log.error('Could not parse in ChatTextEvent', e)
        }
    }

    const segments = parseMessageText(content.body)
    return (
        <>
            {segments.map((segment, index) => (
                <React.Fragment key={index}>
                    {segment.type === 'text' ? (
                        renderTextWithBreaks(segment.content)
                    ) : (
                        <ExternalLink
                            href={segment.content}
                            target="_blank"
                            rel="noopener noreferrer">
                            {segment.content}
                        </ExternalLink>
                    )}
                </React.Fragment>
            ))}
        </>
    )
}

const Formatted = styled('div', {
    whiteSpace: 'pre-wrap',
})

const A = styled('a', {
    textDecoration: 'underline',
    wordBreak: 'break-word',
    '&:hover': {
        opacity: 0.8,
    },
    '&.self-mention': {
        fontWeight: 700,
    },
})

const ExternalLink = styled('a', {
    textDecoration: 'underline',
    '&:hover': {
        opacity: 0.8,
    },
})
