import { Text, Theme, useTheme } from '@rneui/themed'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    ActivityIndicator,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from 'react-native'
import { exists } from 'react-native-fs'
import Share from 'react-native-share'

import { useToast } from '@fedi/common/hooks/toast'
import { MatrixEventContentType } from '@fedi/common/utils/matrix'
import { formatFileSize } from '@fedi/common/utils/media'

import { setSelectedChatMessage } from '@fedi/common/redux'
import { MatrixEvent } from '@fedi/common/types'
import { fedimint } from '../../../bridge'
import { useAppDispatch } from '../../../state/hooks'
import SvgImage from '../../ui/SvgImage'

type ChatImageEventProps = {
    event: MatrixEvent<MatrixEventContentType<'m.file'>>
}

const ChatFileEvent: React.FC<ChatImageEventProps> = ({
    event,
}: ChatImageEventProps) => {
    const [isLoading, setIsLoading] = useState(false)
    const { theme } = useTheme()
    const toast = useToast()
    const { t } = useTranslation()
    const dispatch = useAppDispatch()

    const handleLongPress = () => {
        dispatch(setSelectedChatMessage(event))
    }

    const handleDownload = useCallback(async () => {
        setIsLoading(true)

        try {
            const path = `${Buffer.from(
                event.content.file.hashes.sha256,
            ).toString('hex')}.${event.content.info.mimetype.split('/')[1]}`

            const filePath = await fedimint.matrixDownloadFile(
                path,
                event.content.file,
            )

            if (await exists(filePath)) {
                const mime = event.content.info.mimetype.split('/')[1]

                try {
                    await Share.open({
                        filename:
                            Platform.OS === 'android'
                                ? event.content.body.slice(0, -mime.length)
                                : event.content.body,
                        type: event.content.info.mimetype,
                        url: filePath,
                    })

                    toast.show({
                        content: t('feature.chat.file-saved'),
                        status: 'success',
                    })
                } catch {
                    /* no-op*/
                }
            }
        } catch (err) {
            toast.error(t, err, 'errors.unknown-error')
        } finally {
            setIsLoading(false)
        }
    }, [event.content, t, toast])

    const style = styles(theme)

    return (
        <Pressable style={style.attachment} onLongPress={handleLongPress}>
            <View style={style.attachmentContentGutter}>
                <View style={style.attachmentIcon}>
                    <SvgImage name="File" />
                </View>
                <View style={style.attachmentContent}>
                    <Text medium ellipsizeMode="middle" numberOfLines={1}>
                        {event.content.body}
                    </Text>
                    <Text style={style.attachmentSize} caption>
                        {formatFileSize(event.content.info.size ?? 0)}
                    </Text>
                </View>
            </View>
            <Pressable onPress={handleDownload}>
                <View style={style.downloadButton}>
                    {isLoading ? (
                        <ActivityIndicator />
                    ) : (
                        <SvgImage name="Download" />
                    )}
                </View>
            </Pressable>
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        attachmentContentGutter: {
            flex: 1,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
        },
        attachment: {
            padding: theme.spacing.sm,
            borderRadius: 8,
            backgroundColor: theme.colors.offWhite,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            maxWidth: theme.sizes.maxMessageWidth,
            width: '100%',
        },
        attachmentIcon: {
            width: 48,
            height: 48,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.extraLightGrey,
            borderRadius: 8,
        },
        attachmentContent: {
            flex: 1,
            flexDirection: 'column',
            display: 'flex',
            gap: theme.spacing.xs,
        },
        attachmentSize: {
            color: theme.colors.darkGrey,
        },
        downloadButton: {
            width: 40,
            height: 40,
            borderRadius: 60,
            borderWidth: 1,
            borderColor: theme.colors.lightGrey,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
    })

export default ChatFileEvent
