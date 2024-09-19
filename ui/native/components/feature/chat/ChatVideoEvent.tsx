import { Text, Theme, useTheme } from '@rneui/themed'
import { useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native'
import { exists } from 'react-native-fs'

import { makeLog } from '@fedi/common/utils/log'
import { MatrixEventContentType } from '@fedi/common/utils/matrix'
import { scaleAttachment } from '@fedi/common/utils/media'
import { useTranslation } from 'react-i18next'
import Video from 'react-native-video'
import { fedimint } from '../../../bridge'
import SvgImage from '../../ui/SvgImage'

type ChatVideoEventProps = {
    content: MatrixEventContentType<'m.video'>
}

const log = makeLog('ChatVideoEvent')

const ChatVideoEvent: React.FC<ChatVideoEventProps> = ({
    content,
}: ChatVideoEventProps) => {
    const [isLoading, setIsLoading] = useState(true)
    const [isError, setIsError] = useState(false)
    const [uri, setURI] = useState<string>('')
    const [paused, setPaused] = useState(true)
    const { theme } = useTheme()
    const { t } = useTranslation()
    const videoRef = useRef<Video | null>(null)

    useEffect(() => {
        const loadVideo = async () => {
            try {
                const path = `${Buffer.from(
                    content.file.hashes.sha256,
                ).toString('hex')}.${content.info.mimetype.split('/')[1]}`

                const videoPath = await fedimint.matrixDownloadFile(
                    path,
                    content,
                )

                if (await exists(videoPath)) {
                    setURI(videoPath)
                } else {
                    throw new Error('Video does not exist in fs')
                }
            } catch (err) {
                log.error('Failed to load video', err)
                setIsError(true)
            } finally {
                setIsLoading(false)
            }
        }

        loadVideo()
    }, [content])

    const style = styles(theme)

    const dimensions = scaleAttachment(
        content.info.w,
        content.info.h,
        theme.sizes.maxMessageWidth,
        400,
    )

    const videoBaseStyle = [style.videoBase, dimensions]

    return isLoading || !uri || isError ? (
        <View style={videoBaseStyle}>
            {isError ? (
                <View style={style.videoStyle}>
                    <SvgImage name="VideoOff" color={theme.colors.grey} />
                    <Text caption style={style.errorCaption}>
                        {t('errors.failed-to-load-video')}
                    </Text>
                </View>
            ) : (
                <ActivityIndicator />
            )}
        </View>
    ) : (
        <View style={style.videoContainer}>
            <Video
                ref={videoRef}
                source={{ uri }}
                style={videoBaseStyle}
                onError={() => setIsError(true)}
                paused={paused}
                onFullscreenPlayerDidPresent={() => setPaused(false)}
                onFullscreenPlayerWillDismiss={() => setPaused(true)}
            />
            {paused && (
                <TouchableOpacity
                    style={style.overlay}
                    onPress={() => {
                        videoRef.current?.presentFullscreenPlayer()
                    }}>
                    <View style={style.playButton}>
                        <SvgImage name="Play" color={theme.colors.white} />
                    </View>
                </TouchableOpacity>
            )}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        videoBase: {
            maxWidth: theme.sizes.maxMessageWidth,
            maxHeight: 400,
            backgroundColor: theme.colors.extraLightGrey,
            padding: 16,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        },
        videoStyle: {
            flexDirection: 'column',
            gap: theme.spacing.md,
            alignItems: 'center',
        },
        errorCaption: {
            color: theme.colors.darkGrey,
        },
        videoContainer: {
            position: 'relative',
        },
        overlay: {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            justifyContent: 'center',
            alignItems: 'center',
        },
        playButton: {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        },
    })

export default ChatVideoEvent
