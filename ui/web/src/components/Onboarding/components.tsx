import { styled } from '../../styles'

export const OnboardingContainer = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 48,
    alignItems: 'center',
    height: '100%',
    width: '100%',
    maxWidth: 330,

    variants: {
        fullWidth: {
            true: {
                maxWidth: 'none',
            },
        },
    },
})

export const OnboardingContent = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',

    variants: {
        justify: {
            center: {
                justifyContent: 'center',
            },
            start: {
                justifyContent: 'flex-start',
            },
        },
        gap: {
            sm: {
                gap: 8,
            },
            md: {
                gap: 16,
            },
        },
    },
    defaultVariants: {
        justify: 'center',
        gap: 'sm',
    },
})

export const OnboardingActions = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    gap: 16,
})
