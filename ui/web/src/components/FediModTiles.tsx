import Image from 'next/image'
import React from 'react'

import { selectFederationFediMods } from '@fedi/common/redux'

import { SITE_IMAGES } from '../constants/siteimages'
import { useAppSelector } from '../hooks'
import { styled } from '../styles'
import { Text } from './Text'

export const FediModTiles: React.FC = () => {
    const fediMods = useAppSelector(selectFederationFediMods)

    return (
        <Container>
            {fediMods.map(site => {
                const image = SITE_IMAGES[site.id]
                return (
                    <FediModTile
                        key={site.id}
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer">
                        {image ? (
                            <FediModIcon
                                src={image}
                                alt=""
                                width={48}
                                height={48}
                            />
                        ) : (
                            <FediModIcon as="div" />
                        )}
                        <FediModTitle>
                            <Text variant="small" ellipsize>
                                {site.title}
                            </Text>
                        </FediModTitle>
                    </FediModTile>
                )
            })}
        </Container>
    )
}

const Container = styled('div', {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    alignItems: 'end',
    justifyContent: 'space-between',

    '@sm': {
        gridTemplateColumns: 'repeat(3, 1fr)',
        justifyContent: 'space-evenly',
    },
    '@xs': {
        gridTemplateColumns: 'repeat(2, 1fr)',
    },
})

const FediModTile = styled('a', {
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

const FediModIcon = styled(Image, {
    width: 48,
    height: 48,
    borderRadius: 12,
})

const FediModTitle = styled('div', {
    margin: '0 -16px',
    maxWidth: '100%',
    minWidth: 0,
})
