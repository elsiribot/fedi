import { createStitches } from '@stitches/react'
import { theme as fediTheme } from '@fedi/common/constants/theme'

export const {
    styled,
    css,
    globalCss,
    keyframes,
    getCssText,
    theme,
    createTheme,
    config,
} = createStitches({
    theme: {
        colors: {
            ...fediTheme.colors,
        },
        sizes: fediTheme.sizes,
        space: fediTheme.spacing,
        fonts: {
            albert: `'Albert Sans', sans-serif`,
            mono: `"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace`,
        },
        fontSizes: fediTheme.fontSizes,
    },
    media: {},
    utils: {
        holoGradient: (value: keyof (typeof fediTheme)['holoGradient']) => ({
            backgroundImage: `radial-gradient(89.9% 222.34% at 7.36% 24.19%, ${fediTheme.holoGradient[
                value
            ].join(', ')})`,
        }),
    },
})
