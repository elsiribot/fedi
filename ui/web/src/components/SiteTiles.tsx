import React from 'react'

import { selectFederationSites } from '@fedi/common/redux'

import { useAppSelector } from '../hooks'
import { styled, theme } from '../styles'
import { Text } from './Text'

export const SiteTiles: React.FC = () => {
    const sites = useAppSelector(selectFederationSites)

    return (
        <Container>
            {sites.map(site => (
                <SiteTile href={site.url} key={site.id}>
                    <SiteIcon />
                    <Text variant="small">{site.title}</Text>
                </SiteTile>
            ))}
        </Container>
    )
}

const Container = styled('div', {
    display: 'flex',
    flexWrap: 'wrap',
    margin: '0 -16px',
})

const SiteTile = styled('a', {
    display: 'inline-flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: 96,
    height: 96,
    padding: 4,
})

const SiteIcon = styled('div', {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: theme.colors.keyboardGrey,
})
