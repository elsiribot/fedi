import { useRouter } from 'next/router'

import ChevronLeft from '@fedi/common/assets/svgs/chevron-left.svg'
import CloseIcon from '@fedi/common/assets/svgs/close.svg'

import { keyframes, styled, theme } from '../styles'
import { Icon } from './Icon'
import { IconButton } from './IconButton'
import { ShadowScroller } from './ShadowScroller'

type Props = {
    back?: string | boolean
    showCloseButton?: boolean
    centered?: boolean
}

export function Header({
    children,
    back,
    showCloseButton,
    centered,
    ...props
}: React.ComponentProps<typeof HeaderContainer> & Props) {
    const router = useRouter()

    return (
        <HeaderContainer {...props}>
            {back && (
                <ButtonWrapper isBack>
                    <IconButton
                        icon={ChevronLeft}
                        size="md"
                        onClick={
                            // provide string to specify next route on back
                            // or provide boolean to call router history back
                            typeof back === 'string'
                                ? () => router.push(back)
                                : () => router.back()
                        }
                    />
                </ButtonWrapper>
            )}
            <HeaderContent centered={centered}>{children}</HeaderContent>
            {showCloseButton && (
                <ButtonWrapper isClose>
                    <Icon icon={CloseIcon} onClick={() => router.back()} />
                </ButtonWrapper>
            )}
        </HeaderContainer>
    )
}

export const Root = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
})

export const HeaderContainer = styled('div', {
    alignItems: 'center',
    display: 'flex',
    height: 64,
    position: 'relative',
    width: '100%',
})

export const ButtonWrapper = styled('div', {
    alignItems: 'center',
    cursor: 'pointer',
    display: 'flex',
    height: '100%',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    width: 50,

    variants: {
        isBack: {
            true: {
                left: 0,
            },
        },
        isClose: {
            true: {
                right: 0,
            },
        },
    },
})

const HeaderContent = styled('div', {
    alignItems: 'center',
    display: 'flex',
    flex: 1,
    justifyContent: 'space-between',
    gap: 8,
    height: '100%',
    width: '100%',
    padding: '0 16px',

    variants: {
        centered: {
            true: {
                justifyContent: 'center',
            },
        },
    },
})

export const Title = styled('h1', {
    fontSize: theme.fontSizes.h2,
    fontWeight: theme.fontWeights.medium,
    lineHeight: 1.5,

    variants: {
        small: {
            true: {
                fontSize: theme.fontSizes.h2,
                fontWeight: theme.fontWeights.medium,
            },
        },
        subheader: {
            true: {
                fontSize: theme.fontSizes.body,
                fontWeight: theme.fontWeights.bold,
                flexGrow: 1,
                textAlign: 'center',
            },
        },
    },
})

const fadeIn = keyframes({
    '0%': { opacity: 0 },
    '100%': { opacity: 1 },
})

export const Content = styled(ShadowScroller, {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    width: '100%',

    '& > *:first-child': {
        height: '100%',
        overflow: 'auto',
        overscrollBehavior: 'contain',
        '-webkit-overflow-scrolling': 'touch',
    },

    variants: {
        fullWidth: {
            true: {},
            false: {
                '& > *:first-child': {
                    padding: 20,
                },
            },
        },

        centered: {
            true: {
                justifyContent: 'center',

                '& > *:first-child': {
                    height: 'auto',
                },
            },
        },

        fadeIn: {
            true: {
                animation: `${fadeIn} .8s ease`,
            },
        },
    },
    defaultVariants: {
        fullWidth: false,
        centered: false,
    },
})

export const Actions = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
    paddingTop: 24,
    gap: 16,
    padding: '24px 24px 24px',

    '@standalone': {
        '.hide-navigation &': {
            '@sm': {
                paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
            },
            '@xs': {
                paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            },
        },
    },
})
