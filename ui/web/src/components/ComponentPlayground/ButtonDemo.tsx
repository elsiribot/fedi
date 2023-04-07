import React from 'react'

import cogIcon from '@fedi/common/assets/svgs/cog.svg'

import { Button } from '../../components/Button'
import { styled } from '../../styles'

export const ButtonDemo: React.FC = () => {
    const sizes = ['md', 'sm'] as const
    const variants = ['primary', 'secondary', 'tertiary', 'outline'] as const

    return (
        <Container>
            {sizes.map(size => (
                <ButtonGroup key={size}>
                    {variants.map(variant => (
                        <ButtonRow key={variant}>
                            <Button size={size} variant={variant}>
                                Button {size} {variant}
                            </Button>
                            <Button
                                size={size}
                                variant={variant}
                                icon={cogIcon}>
                                Button {size} {variant}
                            </Button>
                            <Button
                                size={size}
                                variant={variant}
                                href="/playground">
                                Internal PWA link
                            </Button>
                            <Button
                                size={size}
                                variant={variant}
                                href="https://fedi.xyz">
                                External link
                            </Button>
                        </ButtonRow>
                    ))}
                </ButtonGroup>
            ))}
        </Container>
    )
}

const Container = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 40,
})

const ButtonGroup = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
})

const ButtonRow = styled('div', {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
})
