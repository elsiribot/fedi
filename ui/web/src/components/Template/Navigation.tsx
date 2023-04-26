import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'
import { useTranslation } from 'react-i18next'

import ChatIcon from '@fedi/common/assets/svgs/chat.svg'
import CogIcon from '@fedi/common/assets/svgs/cog.svg'
import FediLogo from '@fedi/common/assets/svgs/fedi-logo.svg'
import HomeIcon from '@fedi/common/assets/svgs/home.svg'

import { keyframes, styled, theme } from '../../styles'
import { Icon } from '../Icon'
import { Text } from '../Text'

const NAVIGATION = [
    {
        name: 'words.home',
        path: '/',
        icon: HomeIcon,
    },
    {
        name: 'words.chat',
        path: '/chat',
        icon: ChatIcon,
    },
    {
        name: 'words.admin',
        path: '/admin',
        icon: CogIcon,
    },
] as const

export const Navigation: React.FC = () => {
    const router = useRouter()
    const { t } = useTranslation()

    const getIsActive = (navPath: string) => {
        if (navPath === router.pathname) return true
        if (navPath !== '/' && router.pathname.startsWith(navPath)) return true
        return false
    }

    return (
        <Container>
            <Logo>
                <Link href="/">
                    <FediLogo />
                </Link>
            </Logo>
            <Nav>
                {NAVIGATION.map(nav => (
                    <NavItem key={nav.path} isActive={getIsActive(nav.path)}>
                        <Link href={nav.path}>
                            <Icon icon={nav.icon} />
                            <Text variant="body" weight="medium">
                                {t(nav.name)}
                            </Text>
                        </Link>
                    </NavItem>
                ))}
            </Nav>
        </Container>
    )
}

export const containerSlideIn = keyframes({
    '0%': {
        transform: 'translateX(-100%)',
        opacity: 0,
    },
    '100%': {
        transform: 'translateX(0)',
        opacity: 1,
    },
})

const Container = styled('nav', {
    width: 270,
    flexShrink: 0,
    padding: 32,
    background: theme.colors.white,
    animation: `${containerSlideIn} 200ms ease`,

    '@md': {
        width: '100%',
        padding: 0,
        animation: 'none',
    },
})

const Logo = styled('div', {
    marginBottom: 80,

    '& a': {
        textDecoration: 'none',
    },
    '& svg': {
        width: 88,
    },

    '@md': {
        display: 'none',
    },
})

const Nav = styled('ul', {
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
    margin: '0 -8px',

    '@md': {
        flexDirection: 'row',
        justifyContent: 'center',
        margin: 0,
    },
})

const NavItem = styled('li', {
    flex: 1,
    display: 'flex',
    listStyle: 'none',
    color: theme.colors.darkGrey,

    '&:hover, &:focus': {
        color: theme.colors.primary,
    },

    '& a': {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '24px 8px',
        textDecoration: 'none',
        color: 'inherit',
    },

    '@md': {
        justifyContent: 'center',

        '& a': {
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 16,
        },
    },

    variants: {
        isActive: {
            true: {
                color: theme.colors.primary,
            },
        },
    },
})
