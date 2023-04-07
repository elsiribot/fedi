import React from 'react'
import { ContentBlock } from '../components/ContentBlock'
import { Text } from '../components/Text'
import { styled, theme } from '../styles'

function ChatPage() {
    return (
        <ContentBlock>
            <Title>
                <Text variant="h1">Chat</Text>
            </Title>
            <Placeholder>
                <Text variant="h2" weight="normal">
                    Nothing to see here (yet!)
                </Text>
            </Placeholder>
        </ContentBlock>
    )
}

const Title = styled('div', {
    marginBottom: 16,
})

const Placeholder = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
    height: 220,
    color: theme.colors.lightGrey,
})

export default ChatPage
