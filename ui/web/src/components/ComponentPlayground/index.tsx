import React from 'react'
import { styled, theme } from '../../styles'
import { Text } from '../../components/Text'
import { TextDemo } from './TextDemo'
import { ButtonDemo } from './ButtonDemo'
import { FormDemo } from './FormDemo'
import { AvatarDemo } from './AvatarDemo'

export const ComponentPlayground: React.FC = () => {
    const demos = [
        {
            title: 'Text',
            content: <TextDemo />,
        },
        {
            title: 'Button',
            content: <ButtonDemo />,
        },
        {
            title: 'Form fields',
            content: <FormDemo />,
        },
        {
            title: 'Avatar',
            content: <AvatarDemo />,
        },
    ]

    return (
        <Container>
            <Text variant="display">Component Playground</Text>
            {demos.map(demo => (
                <div key={demo.title}>
                    <Text variant="h1">{demo.title}</Text>
                    <DemoContent>{demo.content}</DemoContent>
                </div>
            ))}
        </Container>
    )
}

const Container = styled('div', {
    maxWidth: 980,
    padding: 20,
    margin: '0 auto',
})

const DemoContent = styled('div', {
    border: `1px solid ${theme.colors.lightGrey}`,
    background: `1px solid ${theme.colors.lightestGrey}`,
    padding: 20,
    borderRadius: 20,
    marginBottom: 40,
})
