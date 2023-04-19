import { create as createQrCode } from 'qrcode'
import React, { useEffect, useState } from 'react'

import { styled, theme } from '../styles'
import { renderStyledQrSvg } from '../utils/qrcode'

interface Props {
    data: string
}

export const QRCode: React.FC<Props> = ({ data }) => {
    const [qrSvg, setQrSvg] = useState('')

    useEffect(() => {
        setQrSvg(renderStyledQrSvg(createQrCode(data)))
    }, [data])

    return (
        <Container>
            <Inner dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </Container>
    )
}

const Container = styled('div', {
    width: '100%',
    aspectRatio: '1 / 1',
    holoGradient: '900',
    padding: 4,
    borderRadius: 20,
})

const Inner = styled('div', {
    width: '100%',
    aspectRatio: '1 / 1',
    background: theme.colors.white,
    padding: 20,
    borderRadius: 16,
})
