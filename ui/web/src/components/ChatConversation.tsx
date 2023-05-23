import { useRouter } from 'next/router'
import React, { useCallback, useMemo, useRef, useState } from 'react'

import ChevronLeftIcon from '@fedi/common/assets/svgs/chevron-left.svg'
import SendArrowUpCircleIcon from '@fedi/common/assets/svgs/send-arrow-up-circle.svg'
import SocialPeopleIcon from '@fedi/common/assets/svgs/social-people.svg'
import { ChatMessage as ChatMessageType, ChatType } from '@fedi/common/types'
import { makeMessageGroups } from '@fedi/common/utils/chat'

import { useToast, useAutosizeTextArea } from '../hooks'
import { styled, theme } from '../styles'
import { Avatar } from './Avatar'
import { ChatMessageCollection } from './ChatMessageCollection'
import { Icon } from './Icon'
import { IconButton } from './IconButton'
import { Text } from './Text'

interface Props {
    type: ChatType
    id: string
    name: string
    messages: ChatMessageType[]
    headerActions?: React.ReactNode
    inputActions?: React.ReactNode
    onSendMessage(message: string): Promise<void>
}

export const ChatConversation: React.FC<Props> = ({
    type,
    id,
    name,
    messages,
    headerActions,
    inputActions,
    onSendMessage,
}) => {
    const toast = useToast()
    const { back } = useRouter()
    const [value, setValue] = useState('')
    const [isSending, setIsSending] = useState(false)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    useAutosizeTextArea(inputRef.current, value)

    const handleSend = useCallback(
        async (ev?: React.FormEvent) => {
            if (ev) {
                ev.preventDefault()
            }
            if (!value) return
            setIsSending(true)
            try {
                await onSendMessage(value)
                setValue('')
                requestAnimationFrame(() => inputRef.current?.focus())
            } catch (err) {
                toast.showErrorToast(err, 'errors.chat-connection-unhealthy')
            }
            setIsSending(false)
        },
        [onSendMessage, value, toast, inputRef],
    )

    const handleInputKeyDown = useCallback(
        (ev: React.KeyboardEvent) => {
            const hasMofidier = ev.shiftKey || ev.metaKey
            if (ev.key === 'Enter' && !(ev.shiftKey || ev.metaKey)) {
                ev.preventDefault()
                handleSend()
            }
        },
        [handleSend],
    )

    const messageCollections = useMemo(
        () => makeMessageGroups(messages, 'desc'),
        [messages],
    )

    return (
        <Container>
            <Header>
                <BackButton>
                    <IconButton
                        size="md"
                        icon={ChevronLeftIcon}
                        onClick={() => back()}
                    />
                </BackButton>
                <Avatar
                    id={id}
                    name={name}
                    icon={
                        type === ChatType.group ? SocialPeopleIcon : undefined
                    }
                />
                <Text weight="medium" css={{ flex: 1 }}>
                    {name}
                </Text>
                {headerActions && (
                    <HeaderActions>{headerActions}</HeaderActions>
                )}
            </Header>
            <Messages>
                {messageCollections.map(collection => (
                    <ChatMessageCollection
                        key={collection[0][0].id}
                        collection={collection}
                        showUsernames={type === ChatType.group}
                    />
                ))}
            </Messages>
            <Actions onSubmit={handleSend}>
                {inputActions && <InputActions>{inputActions}</InputActions>}
                <Input
                    ref={inputRef}
                    value={value}
                    onChange={ev => setValue(ev.currentTarget.value)}
                    placeholder="Message"
                    autoFocus
                    rows={1}
                    onKeyDown={handleInputKeyDown}
                    disabled={isSending}
                />
                <SendButton disabled={!value || isSending} type="submit">
                    <Icon icon={SendArrowUpCircleIcon} />
                </SendButton>
            </Actions>
        </Container>
    )
}

const Container = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
})

const Header = styled('div', {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    gap: 12,
    flexShrink: 0,
})

const BackButton = styled('div', {
    display: 'none',
    '@sm': {
        display: 'block',
    },
})

const HeaderActions = styled('div', {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
})

const Messages = styled('div', {
    flex: 1,
    minHeight: 0,
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column-reverse',
    overflow: 'auto',
})

const Actions = styled('form', {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    padding: 8,
    borderTop: `1px solid ${theme.colors.lightGrey}`,
})

const InputActions = styled('div', {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
})

const Input = styled('textarea', {
    flex: 1,
    maxHeight: 120,
    padding: 8,
    border: 0,
    background: 'none',
    resize: 'none',

    '&:hover, &:focus': {
        outline: 'none',
    },
})

const SendButton = styled('button', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    color: theme.colors.blue,

    '&:disabled': {
        color: theme.colors.lightGrey,
    },

    '&:hover, &:focus': {
        outline: 'none',
        filter: 'brightness(1.25)',
    },

    '& > svg': {
        width: 24,
        height: 24,
    },
})
