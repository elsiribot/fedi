import React from 'react'
import { styled } from '../styles'

export interface TextProps {
    variant?: 'display' | 'h1' | 'h2' | 'body' | 'caption' | 'small' | 'tiny'
    weight?: 'normal' | 'medium' | 'bold'
    children: React.ReactNode
    className?: string
}

export const Text: React.FC<TextProps> = ({
    variant = 'body',
    weight = 'normal',
    children,
}) => {
    return (
        <TextElement variant={variant} weight={weight}>
            {children}
        </TextElement>
    )
}

const TextElement = styled('div', {
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.25,
    letterSpacing: '-1%',
    color: 'inherit',

    variants: {
        weight: {
            normal: { fontWeight: 400 },
            medium: { fontWeight: 500 },
            bold: { fontWeight: 600 },
        },
        variant: {
            display: {
                fontSize: 80,
                fontWeight: 700,
                lineHeight: 1.5,
            },
            h1: {
                fontSize: 32,
                fontWeight: 700,
                lineHeight: 1.5,
            },
            h2: {
                fontSize: 24,
                fontWeight: 700,
                lineHeight: 1.5,
            },
            body: { fontSize: 16 },
            caption: { fontSize: 14 },
            small: { fontSize: 12 },
            tiny: { fontSize: 10 },
        },
    },
    defaultVariants: {
        variant: 'body',
        weight: 'normal',
    },
})
