import Image from 'next/image'
import React from 'react'
import { useTranslation } from 'react-i18next'

import ImageOff from '@fedi/common/assets/svgs/image-off.svg'
import { MatrixEvent } from '@fedi/common/types'
import { MatrixEventContentType } from '@fedi/common/utils/matrix'

import { Icon } from '../../components/Icon'
import { Text } from '../../components/Text'
import { useLoadMedia } from '../../hooks/media'
import { keyframes, styled, theme } from '../../styles'

interface Props {
    event: MatrixEvent<MatrixEventContentType<'m.image'>>
}

export const ChatImageEvent: React.FC<Props> = ({ event }) => {
    const { t } = useTranslation()
    const { error, loading, src } = useLoadMedia(event)

    if (loading || !src) return null

    if (error) {
        return (
            <ImgWrapper css={{ padding: 10, textAlign: 'center' }}>
                <Icon icon={ImageOff} size="sm" />
                <Text variant="small" css={{ color: theme.colors.darkGrey }}>
                    {t('errors.failed-to-load-image')}
                </Text>
            </ImgWrapper>
        )
    }

    return (
        <ImgWrapper>
            <Img src={src} alt="image" width={0} height={0} loading="lazy" />
        </ImgWrapper>
    )
}

const fadeIn = keyframes({
    '0%': { opacity: 0 },
    '100%': { opacity: 1 },
})

const ImgWrapper = styled('div', {
    animation: `${fadeIn} 1s ease`,
    borderRadius: theme.sizes.xxs,
    height: '100%',
    maxHeight: 400,
    maxWidth: 400,
    overflow: 'hidden',
    width: '100%',
})

const Img = styled(Image, {
    height: '100%',
    width: '100%',
})
