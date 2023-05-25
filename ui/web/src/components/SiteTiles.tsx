import Image from 'next/image'
import React from 'react'

import { selectFederationSites } from '@fedi/common/redux'

import { SITE_IMAGES } from '../constants/siteimages'
import { useAppSelector } from '../hooks'
import { styled, theme } from '../styles'
import { Text } from './Text'

export const SiteTiles: React.FC = () => {
    const sites = useAppSelector(selectFederationSites)

    return (
        <Container>
            {sites.map(site => {
                const image = SITE_IMAGES[site.id]
                return (
                    <SiteTile
                        key={site.id}
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer">
                        {image ? (
                            <SiteIcon
                                src={image}
                                alt=""
                                width={48}
                                height={48}
                            />
                        ) : (
                            <SiteIcon as="div" />
                        )}
                        <SiteTitle>
                            <Text variant="small" ellipsize>
                                {site.title}
                            </Text>
                        </SiteTitle>
                    </SiteTile>
                )
            })}
        </Container>
    )
}

const Container = styled('div', {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    alignItems: 'end',
    margin: '0 -16px',

    '@sm': {
        gridTemplateColumns: 'repeat(3, 1fr)',
        justifyContent: 'space-evenly',
    },
    '@xs': {
        gridTemplateColumns: 'repeat(2, 1fr)',
    },
})

const SiteTile = styled('a', {
    display: 'inline-flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    gap: 8,
    width: 96,
    height: 96,
    padding: 4,
    margin: '0 auto',
    borderRadius: 8,
    transition: 'background-color 80ms ease',
    overflow: 'hidden',

    '&:hover, &:focus': {
        background: `rgba(0, 0, 0, 0.04)`,
    },
})

const SiteIcon = styled(Image, {
    width: 48,
    height: 48,
    borderRadius: 12,
})

const SiteTitle = styled('div', {
    maxWidth: '100%',
    minWidth: 0,
})
