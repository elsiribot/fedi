import React, { useState } from 'react'

import { Button } from '../../components/Button'
import { useToast } from '../../hooks'
import { styled } from '../../styles'
import { Input } from '../Input'

export const ToastDemo: React.FC = () => {
    const [content, setContent] = useState(
        'Failed to toast, requires at least one toaster to be available.',
    )
    const { showToast } = useToast()

    return (
        <Container>
            <Input
                label="content"
                value={content}
                onChange={ev => setContent(ev.currentTarget.value)}
            />
            <Button variant="primary" onClick={() => showToast({ content })}>
                Open toast
            </Button>
        </Container>
    )
}

const Container = styled('div', {
    display: 'flex',
    maxWidth: 320,
    flexDirection: 'column',
    gap: 16,
})
