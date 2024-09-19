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

import { fedimint } from '../../../bridge'
import SvgImage from '../../ui/SvgImage'

type ChatImageEventProps = {
    content: MatrixEventContentType<'m.file'>
}

const ChatImageEvent: React.FC<ChatImageEventProps> = ({
    content,
}: ChatImageEventProps) => {
    const [isLoading, setIsLoading] = useState(false)
    const { theme } = useTheme()
    const toast = useToast()
    const { t } = useTranslation()

    const handleDownload = useCallback(async () => {
        setIsLoading(true)

        try {
            const path = `${Buffer.from(content.file.hashes.sha256).toString(
                'hex',
            )}.${content.info.mimetype.split('/')[1]}`

            const filePath = await fedimint.matrixDownloadFile(
                path,
                content.file,
            )

            if (await exists(filePath)) {
                const mime = content.info.mimetype.split('/')[1]

                try {
                    await Share.open({
                        filename:
                            Platform.OS === 'android'
                                ? content.body.slice(0, -mime.length)
                                : content.body,
                        type: content.info.mimetype,
                        url: filePath,
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
    }, [content, t, toast])

    const style = styles(theme)

    return (
        <View style={style.attachment}>
            <View style={style.attachmentContentGutter}>
                <View style={style.attachmentIcon}>
                    <SvgImage name="File" />
                </View>
                <View style={style.attachmentContent}>
                    <Text medium ellipsizeMode="middle" numberOfLines={1}>
                        {content.body}
                    </Text>
                    <Text style={style.attachmentSize} caption>
                        {formatFileSize(content.info.size ?? 0)}
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
        </View>
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

export default ChatImageEvent
