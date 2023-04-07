import React from 'react'
import { styled, theme } from '../../styles'
import { Text } from '../../components/Text'
import { TextDemo } from './TextDemo'
import { ButtonDemo } from './ButtonDemo'
import { FormDemo } from './FormDemo'
import { AvatarDemo } from './AvatarDemo'
import { IconDemo } from './IconDemo'

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
        {
            title: 'Icons',
            content: <IconDemo />,
        },
    ]

    return (
        <Container>
            <Inner>
                <Text variant="display">Component Playground</Text>
                {demos.map(demo => (
                    <div key={demo.title}>
                        <Text variant="h1">{demo.title}</Text>
                        <DemoContent>{demo.content}</DemoContent>
                    </div>
                ))}
            </Inner>
        </Container>
    )
}

const Container = styled('div', {
    padding: 20,
    holoGradient: '100',
})

const Inner = styled('div', {
    maxWidth: 980,
    margin: '0 auto',
})

const DemoContent = styled('div', {
    border: `1px solid ${theme.colors.lightGrey}`,
    background: theme.colors.white,
    padding: 20,
    borderRadius: 20,
    marginBottom: 40,
})
