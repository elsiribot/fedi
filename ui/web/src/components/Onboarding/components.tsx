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
    maxWidth: 320,
})

export const OnboardingContent = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,

    variants: {
        justify: {
            center: {
                justifyContent: 'center',
            },
            start: {
                justifyContent: 'flex-start',
            },
        },
    },
    defaultVariants: {
        justify: 'center',
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
