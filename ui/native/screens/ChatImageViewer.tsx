import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import { useToast } from '@fedi/common/hooks/toast'
import { makeLog } from '@fedi/common/utils/log'
import { ImageZoom } from '@likashefqet/react-native-image-zoom'
import { CameraRoll } from '@react-native-camera-roll/camera-roll'
import { exists } from 'react-native-fs'
import { RESULTS } from 'react-native-permissions'
import SvgImage from '../components/ui/SvgImage'
import type { RootStackParamList } from '../types/navigation'
import { useStoragePermission } from '../utils/hooks'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ChatImageViewer'
>

const log = makeLog('ChatImageViewer')

const ChatImageViewer: React.FC<Props> = ({ route, navigation }: Props) => {
    const insets = useSafeAreaInsets()
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { uri } = route.params
    const toast = useToast()
    const [isDownloading, setIsDownloading] = useState(false)
    const { storagePermission, requestStoragePermission } =
        useStoragePermission()

    const handleDownload = useCallback(async () => {
        if (!uri || !(await exists(uri))) return

        setIsDownloading(true)

        try {
            if (storagePermission !== RESULTS.GRANTED) {
                await requestStoragePermission()
            }

            await CameraRoll.saveAsset(uri, { type: 'photo' })

            toast.show({
                status: 'success',
                content: t('feature.chat.saved-to-photos'),
            })
        } catch (e) {
            log.error('Failed to download image', e)
        } finally {
            setIsDownloading(false)
        }
    }, [uri, storagePermission, requestStoragePermission, t, toast])

    const style = styles(theme, insets)

    return (
        <View style={style.imageViewerContainer}>
            <View style={style.imageViewerHeader}>
                <Pressable onPress={() => navigation.goBack()}>
                    <SvgImage name="Close" color={theme.colors.secondary} />
                </Pressable>
                <Pressable onPress={handleDownload}>
                    {isDownloading ? (
                        <ActivityIndicator />
                    ) : (
                        <SvgImage
                            name="Download"
                            color={theme.colors.secondary}
                        />
                    )}
                </Pressable>
            </View>
            <ImageZoom uri={uri} style={style.imageZoomContainer} />
        </View>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        imageViewerContainer: {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            display: 'flex',
            flex: 1,
            backgroundColor: theme.colors.night,
        },
        imageZoomContainer: {
            flex: 1,
        },
        imageViewerHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
        },
    })

export default ChatImageViewer
