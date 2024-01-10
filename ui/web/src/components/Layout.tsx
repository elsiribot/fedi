import { styled, theme } from '../styles'
import { ShadowScroller } from './ShadowScroller'

export const Root = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
})

export const Header = styled('div', {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 64,

    '@sm': {
        alignItems: 'center',
        padding: '0 16px',
    },

    variants: {
        padded: {
            true: {
                padding: 16,
            },
        },
    },
})

export const Title = styled('h1', {
    fontSize: theme.fontSizes.h1,
    lineHeight: 1.5,
    fontWeight: theme.fontWeights.bold,

    '@sm': {
        fontSize: theme.fontSizes.h2,
        fontWeight: theme.fontWeights.medium,
    },

    variants: {
        small: {
            true: {
                fontSize: theme.fontSizes.h2,
                fontWeight: theme.fontWeights.medium,
            },
        },
    },
})

export const Content = styled(ShadowScroller, {
    flex: 1,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',

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
                '@sm': {
                    '& > *:first-child': {
                        padding: '0 16px 16px',
                    },
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

    '@sm': {
        padding: '24px 24px 24px',
    },

    '@xs': {
        padding: 16,
    },

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
