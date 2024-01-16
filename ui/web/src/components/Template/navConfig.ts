import { useRouter } from 'next/router'

import { usePopupFederationInfo } from '@fedi/common/hooks/federation'

import { useMediaQuery } from '../../hooks'
import { config } from '../../styles'

/**
 * An array of routes or route prefixes that will set the navigation visibility.
 *
 * If `showWhen` is unset, navigation will be hidden for that route.
 * Navigation visibility can be explicitly set with `showWhen`.
 *
 * Absolute routes are prioritized over prefixes.
 * Longer routes are prioritized over shorter routes.
 */
const navRoutes: Array<PrefixRoute | AbsoluteRoute> = [
    {
        prefix: '/chat/group',
        showWhen: 'desktop',
    },
    {
        prefix: '/chat/member',
        showWhen: 'desktop',
    },
    {
        path: '/onboarding',
    },
    // TODO: Hide for personal & social backup
]

/**
 * The logic for displaying the navigation component based on the current route and `navRoutes`.
 */
export function useNavVisibility() {
    const isSm = useMediaQuery(config.media.sm)
    const popupInfo = usePopupFederationInfo()
    const router = useRouter()

    const isPopupOver = !!popupInfo && popupInfo.secondsLeft <= 0

    // Check if the current route matches an absolute route, longest first
    const matchedRoute = (
        navRoutes.filter(r => 'path' in r) as Array<AbsoluteRoute>
    )
        .sort((a, b) => b.path.length - a.path.length)
        .find(route => router.asPath !== '/' && router.asPath === route.path)

    // Check if the current route matches a prefix, longest first
    const matchedPrefix = (
        navRoutes.filter(r => 'prefix' in r) as Array<PrefixRoute>
    )
        .sort((a, b) => b.prefix.length - a.prefix.length)
        .find(
            route =>
                router.asPath !== '/' && router.asPath.startsWith(route.prefix),
        )

    // Prioritize matchedRoute over matchedPrefix
    const matched = matchedRoute || matchedPrefix

    if (!matched) return { hideNavigation: false, isPopupOver }

    let shouldHideNavigation = true
    switch (matched.showWhen) {
        case 'always':
            shouldHideNavigation = false
            break
        // useMediaQuery appears to be mobile-first, so `isSm` translates to > config.media.sm
        case 'desktop':
            shouldHideNavigation = isSm
            break
        case 'mobile':
            shouldHideNavigation = !isSm
            break
    }

    return { hideNavigation: shouldHideNavigation || isPopupOver, isPopupOver }
}

interface PrefixRoute {
    prefix: string
    showWhen?: 'always' | 'desktop' | 'mobile'
}

interface AbsoluteRoute {
    path: string
    showWhen?: 'always' | 'desktop' | 'mobile'
}
