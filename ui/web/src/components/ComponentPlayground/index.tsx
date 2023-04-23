import React from 'react'

import { Text } from '../../components/Text'
import { styled, theme } from '../../styles'
import { ContentBlock } from '../ContentBlock'
import { AvatarDemo } from './AvatarDemo'
import { ButtonDemo } from './ButtonDemo'
import { DialogDemo } from './DialogDemo'
import { FormDemo } from './FormDemo'
import { IconDemo } from './IconDemo'
import { TextDemo } from './TextDemo'
import { ToastDemo } from './ToastDemo'

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
        {
            title: 'Dialog',
            content: <DialogDemo />,
        },
        {
            title: 'Toast',
            content: <ToastDemo />,
        },
    ]

    return (
        <>
            {demos.map(demo => (
                <ContentBlock key={demo.title} maxWidth={1120}>
                    <Title>
                        <Text variant="h1">{demo.title}</Text>
                    </Title>
                    <DemoContent>{demo.content}</DemoContent>
                </ContentBlock>
            ))}
        </>
    )
}

const Title = styled('div', {
    position: 'relative',
    width: '100%',
    paddingBottom: 8,
    marginBottom: 24,

    '&:after': {
        content: '',
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: 4,
        holoGradient: '900',
    },
})

const DemoContent = styled('div', {
    marginTop: 20,
})
