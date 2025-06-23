import React from 'react'
import { useTranslation } from 'react-i18next'

import PlayIcon from '@fedi/common/assets/svgs/play.svg'
import VideoOff from '@fedi/common/assets/svgs/video-off.svg'
import { MatrixEvent } from '@fedi/common/types'
import { MatrixEventContentType } from '@fedi/common/utils/matrix'

import { Icon } from '../../components/Icon'
import { Text } from '../../components/Text'
import { useLoadMedia } from '../../hooks/media'
import { keyframes, styled, theme } from '../../styles'

interface Props {
    event: MatrixEvent<MatrixEventContentType<'m.video'>>
}

export const ChatVideoEvent: React.FC<Props> = ({ event }) => {
    const { t } = useTranslation()
    const { error, loading, src } = useLoadMedia(event)

    if (loading || !src) return null

    if (error) {
        return (
            <VideoWrapper css={{ padding: 10, textAlign: 'center' }}>
                <Icon icon={VideoOff} size="sm" />
                <Text variant="small" css={{ color: theme.colors.darkGrey }}>
                    {t('errors.failed-to-load-video')}
                </Text>
            </VideoWrapper>
        )
    }

    return (
        <VideoWrapper aria-label="video">
            <PlayButtonWrapper>
                <PlayButtonIcon icon={PlayIcon} size="md" />
            </PlayButtonWrapper>
            <Video>
                <source src={src} type={event.content.info.mimetype} />
            </Video>
        </VideoWrapper>
    )
}

const fadeIn = keyframes({
    '0%': { opacity: 0 },
    '100%': { opacity: 1 },
})

const VideoWrapper = styled('div', {
    animation: `${fadeIn} .5s ease`,
    borderRadius: theme.sizes.xxs,
    height: '100%',
    maxHeight: 400,
    maxWidth: 400,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
})

const PlayButtonWrapper = styled('div', {
    background: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '50%',
    left: '50%',
    padding: 8,
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
})

const PlayButtonIcon = styled(Icon, {
    color: theme.colors.white,
    height: 32,
    width: 32,
})

const Video = styled('video', {
    height: '100%',
    width: '100%',
})
