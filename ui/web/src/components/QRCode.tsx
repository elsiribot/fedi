import { create as createQrCode } from 'qrcode'
import React, { useEffect, useState } from 'react'

import { styled, theme } from '../styles'
import { renderStyledQrSvg } from '../utils/qrcode'

interface Props {
    data: string | string[]
}

export const QRCode: React.FC<Props> = ({ data }) => {
    const [qrSvgs, setQrSvgs] = useState<string[] | null>(null)
    const [activeFrame, setActiveFrame] = useState(0)

    useEffect(() => {
        const dataArr = Array.isArray(data) ? data : [data]
        const svgs = dataArr.map(d => renderStyledQrSvg(createQrCode(d)))
        setQrSvgs(svgs)
        setActiveFrame(0)
    }, [data])

    useEffect(() => {
        if (!qrSvgs || qrSvgs.length < 2) return
        const interval = setInterval(
            () => setActiveFrame(f => (f + 1) % qrSvgs.length),
            250,
        )
        return () => clearInterval(interval)
    }, [qrSvgs])

    return (
        <Container>
            {qrSvgs && (
                <Inner
                    key={activeFrame}
                    dangerouslySetInnerHTML={{ __html: qrSvgs[activeFrame] }}
                />
            )}
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
