import * as RadixDialog from '@radix-ui/react-dialog'

import CloseIcon from '@fedi/common/assets/svgs/close.svg'

import { keyframes, styled, theme } from '../styles'
import { Icon } from './Icon'
import { Text } from './Text'

interface Props {
    open: boolean
    onOpenChange(open: boolean): void
    title?: React.ReactNode
    description?: React.ReactNode
    children: React.ReactNode
    size?: 'sm' | 'md' | 'lg'
}

export const Dialog: React.FC<Props> = ({
    open,
    onOpenChange,
    title,
    description,
    children,
    size,
}) => {
    return (
        <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
            <RadixDialog.Portal>
                <Overlay>
                    <Content size={size}>
                        {title && (
                            <Title>
                                <Text variant="body" weight="bold">
                                    {title}
                                </Text>
                            </Title>
                        )}
                        {description && (
                            <Description>
                                <Text variant="caption" weight="medium">
                                    {description}
                                </Text>
                            </Description>
                        )}
                        {children}
                        <CloseButton>
                            <Icon icon={CloseIcon} />
                        </CloseButton>
                    </Content>
                </Overlay>
            </RadixDialog.Portal>
        </RadixDialog.Root>
    )
}

const overlayShow = keyframes({
    '0%': { opacity: 0 },
    '100%': { opacity: 1 },
})

const Overlay = styled(RadixDialog.Overlay, {
    position: 'fixed',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    overflow: 'auto',
    background: theme.colors.primary80,
    animation: `${overlayShow} 150ms ease`,
})

const contentShow = keyframes({
    '0%': {
        opacity: 0,
        transform: 'translateY(3%) scale(0.95)',
    },
    '100%': {
        opacity: 1,
        transform: 'translateY(0) scale(1)',
    },
})

const Content = styled(RadixDialog.Content, {
    position: 'relative',
    padding: 32,
    borderRadius: 20,
    width: '90vw',
    background: theme.colors.white,
    animation: `${contentShow} 150ms ease`,

    variants: {
        size: {
            sm: {
                maxWidth: 340,
            },
            md: {
                maxWidth: 500,
            },
            lg: {
                maxWidth: 640,
            },
        },
    },
    defaultVariants: {
        size: 'md',
    },
})

const Title = styled(RadixDialog.Title, {
    marginBottom: 8,
})

const Description = styled(RadixDialog.Description, {
    color: theme.colors.darkGrey,
    marginBottom: 20,
})

const CloseButton = styled(RadixDialog.Close, {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    opacity: 0.5,
    outline: 'none',
    cursor: 'pointer',

    '&:hover, &:focus': {
        opacity: 1,
    },
})
