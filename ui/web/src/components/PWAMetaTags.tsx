import React from 'react'
import Head from 'next/head'
import { theme as fediTheme } from '@fedi/common/constants/theme'

const metaAppName = 'Fedi'
const metaDescription = 'Fedi in your browser'

// iOS needs a splash screen for each unique device size.
const splashMetas = [
    {
        width: 2048,
        height: 2732,
        deviceWidth: 1024,
        deviceHeight: 1366,
        pixelRatio: 2,
        orientation: 'portrait',
    },
    {
        width: 2732,
        height: 2048,
        deviceWidth: 1024,
        deviceHeight: 1366,
        pixelRatio: 2,
        orientation: 'landscape',
    },
    {
        width: 1668,
        height: 2388,
        deviceWidth: 834,
        deviceHeight: 1194,
        pixelRatio: 2,
        orientation: 'portrait',
    },
    {
        width: 2388,
        height: 1668,
        deviceWidth: 834,
        deviceHeight: 1194,
        pixelRatio: 2,
        orientation: 'landscape',
    },
    {
        width: 1536,
        height: 2048,
        deviceWidth: 768,
        deviceHeight: 1024,
        pixelRatio: 2,
        orientation: 'portrait',
    },
    {
        width: 2048,
        height: 1536,
        deviceWidth: 768,
        deviceHeight: 1024,
        pixelRatio: 2,
        orientation: 'landscape',
    },
    {
        width: 1668,
        height: 2224,
        deviceWidth: 834,
        deviceHeight: 1112,
        pixelRatio: 2,
        orientation: 'portrait',
    },
    {
        width: 2224,
        height: 1668,
        deviceWidth: 834,
        deviceHeight: 1112,
        pixelRatio: 2,
        orientation: 'landscape',
    },
    {
        width: 1620,
        height: 2160,
        deviceWidth: 810,
        deviceHeight: 1080,
        pixelRatio: 2,
        orientation: 'portrait',
    },
    {
        width: 2160,
        height: 1620,
        deviceWidth: 810,
        deviceHeight: 1080,
        pixelRatio: 2,
        orientation: 'landscape',
    },
    {
        width: 1290,
        height: 2796,
        deviceWidth: 430,
        deviceHeight: 932,
        pixelRatio: 3,
        orientation: 'portrait',
    },
    {
        width: 2796,
        height: 1290,
        deviceWidth: 430,
        deviceHeight: 932,
        pixelRatio: 3,
        orientation: 'landscape',
    },
    {
        width: 1179,
        height: 2556,
        deviceWidth: 393,
        deviceHeight: 852,
        pixelRatio: 3,
        orientation: 'portrait',
    },
    {
        width: 2556,
        height: 1179,
        deviceWidth: 393,
        deviceHeight: 852,
        pixelRatio: 3,
        orientation: 'landscape',
    },
    {
        width: 1284,
        height: 2778,
        deviceWidth: 428,
        deviceHeight: 926,
        pixelRatio: 3,
        orientation: 'portrait',
    },
    {
        width: 2778,
        height: 1284,
        deviceWidth: 428,
        deviceHeight: 926,
        pixelRatio: 3,
        orientation: 'landscape',
    },
    {
        width: 1170,
        height: 2532,
        deviceWidth: 390,
        deviceHeight: 844,
        pixelRatio: 3,
        orientation: 'portrait',
    },
    {
        width: 2532,
        height: 1170,
        deviceWidth: 390,
        deviceHeight: 844,
        pixelRatio: 3,
        orientation: 'landscape',
    },
    {
        width: 1125,
        height: 2436,
        deviceWidth: 375,
        deviceHeight: 812,
        pixelRatio: 3,
        orientation: 'portrait',
    },
    {
        width: 2436,
        height: 1125,
        deviceWidth: 375,
        deviceHeight: 812,
        pixelRatio: 3,
        orientation: 'landscape',
    },
    {
        width: 1242,
        height: 2688,
        deviceWidth: 414,
        deviceHeight: 896,
        pixelRatio: 3,
        orientation: 'portrait',
    },
    {
        width: 2688,
        height: 1242,
        deviceWidth: 414,
        deviceHeight: 896,
        pixelRatio: 3,
        orientation: 'landscape',
    },
    {
        width: 828,
        height: 1792,
        deviceWidth: 414,
        deviceHeight: 896,
        pixelRatio: 2,
        orientation: 'portrait',
    },
    {
        width: 1792,
        height: 828,
        deviceWidth: 414,
        deviceHeight: 896,
        pixelRatio: 2,
        orientation: 'landscape',
    },
    {
        width: 1242,
        height: 2208,
        deviceWidth: 414,
        deviceHeight: 736,
        pixelRatio: 3,
        orientation: 'portrait',
    },
    {
        width: 2208,
        height: 1242,
        deviceWidth: 414,
        deviceHeight: 736,
        pixelRatio: 3,
        orientation: 'landscape',
    },
    {
        width: 750,
        height: 1334,
        deviceWidth: 375,
        deviceHeight: 667,
        pixelRatio: 2,
        orientation: 'portrait',
    },
    {
        width: 1334,
        height: 750,
        deviceWidth: 375,
        deviceHeight: 667,
        pixelRatio: 2,
        orientation: 'landscape',
    },
    {
        width: 640,
        height: 1136,
        deviceWidth: 320,
        deviceHeight: 568,
        pixelRatio: 2,
        orientation: 'portrait',
    },
    {
        width: 1136,
        height: 640,
        deviceWidth: 320,
        deviceHeight: 568,
        pixelRatio: 2,
        orientation: 'landscape',
    },
]

export const PWAMetaTags: React.FC = () => {
    return (
        <Head>
            <title>{metaAppName}</title>
            <meta name="description" content={metaDescription} />

            {/* PWA configuration */}
            <meta name="application-name" content={metaAppName} />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta
                name="apple-mobile-web-app-status-bar-style"
                content="default"
            />
            <meta name="apple-mobile-web-app-title" content={metaAppName} />
            <meta name="format-detection" content="telephone=no" />
            <meta name="theme-color" content={fediTheme.colors.white} />
            <link rel="manifest" href="/manifest.json" />

            {/* iOS app icons */}
            <link
                rel="apple-apple-icon"
                href="/assets/icons/apple-icon-iphone.png"
            />
            <link
                rel="apple-apple-icon"
                sizes="152x152"
                href="/assets/icons/apple-icon-ipad.png"
            />
            <link
                rel="apple-apple-icon"
                sizes="180x180"
                href="/assets/icons/apple-icon-iphone-retina.png"
            />
            <link
                rel="apple-apple-icon"
                sizes="167x167"
                href="/assets/icons/apple-icon-ipad-retina.png"
            />
            <link
                rel="mask-icon"
                href="/assets/icons/safari-pinned-tab.svg"
                color={fediTheme.colors.primary}
            />

            {/* iOS startup splash screens */}
            {splashMetas.map((meta, idx) => (
                <link
                    key={idx}
                    rel="apple-touch-startup-image"
                    href={`/assets/icons/apple-splash-${meta.width}-${meta.height}`}
                    media={`(device-width: ${meta.deviceWidth}) and (device-height: ${meta.deviceHeight}) and (-webkit-device-pixel-ratio: ${meta.pixelRatio}) and (orientation: ${meta.orientation})`}
                />
            ))}

            {/* Favicon */}
            <link
                rel="icon"
                type="image/png"
                sizes="32x32"
                href="/assets/icons/favicon-32x32.png"
            />
            <link
                rel="icon"
                type="image/png"
                sizes="16x16"
                href="/assets/icons/favicon-16x16.png"
            />
            <link rel="shortcut icon" href="/favicon.ico" />

            {/* Mobile viewport */}
            <meta
                name="viewport"
                content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover"
            />
        </Head>
    )
}
