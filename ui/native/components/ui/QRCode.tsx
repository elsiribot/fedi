import { Theme, useTheme } from '@rneui/themed'
import { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Animated, Pressable, StyleSheet } from 'react-native'
import { exists } from 'react-native-fs'
import { PermissionStatus, RESULTS } from 'react-native-permissions'
import { Easing } from 'react-native-reanimated'
import Share from 'react-native-share'
import { SvgXml } from 'react-native-svg'
import ViewShot from 'react-native-view-shot'

import { useToast } from '@fedi/common/hooks/toast'
import { renderStyledQrSvg } from '@fedi/common/utils/qrcode'

import { useDownloadPermission } from '../../utils/hooks'

interface Props {
    value: string
    size: number
    logoOverrideUrl?: string
    disableSave?: boolean
}

const QRCode: React.FC<Props> = ({
    value,
    size,
    logoOverrideUrl,
    disableSave,
}) => {
    const animatedPadding = useRef(new Animated.Value(0)).current
    const viewShotRef = useRef<ViewShot>(null)
    const toast = useToast()

    const { theme } = useTheme()
    const { t } = useTranslation()
    const { requestDownloadPermission, downloadPermission } =
        useDownloadPermission()

    const style = styles(theme)

    const handleLongPress = useCallback(async () => {
        if (disableSave) return

        Animated.timing(animatedPadding, {
            toValue: 16,
            duration: 150,
            delay: 0,
            useNativeDriver: false,
            easing: Easing.out(Easing.ease),
        }).start()

        // wait for the animation to complete before attempting to screenshot
        await new Promise(resolve => setTimeout(() => resolve(true), 150))

        try {
            let permissionStatus: PermissionStatus | undefined =
                downloadPermission

            if (downloadPermission !== RESULTS.GRANTED)
                permissionStatus = await requestDownloadPermission()

            if (permissionStatus === RESULTS.GRANTED) {
                const qrUri = await viewShotRef.current?.capture?.()

                if (!qrUri || !(await exists(qrUri))) return

                try {
                    await Share.open({
                        url: qrUri,
                    })
                } catch {
                    /* no-op, user cancelled */
                }
            } else {
                throw new Error(t('errors.please-grant-permission'))
            }
        } catch (e) {
            toast.error(t, e)
        } finally {
            Animated.timing(animatedPadding, {
                toValue: 0,
                duration: 150,
                delay: 0,
                useNativeDriver: false,
                easing: Easing.out(Easing.ease),
            }).start()
        }
    }, [
        animatedPadding,
        downloadPermission,
        requestDownloadPermission,
        t,
        toast,
        disableSave,
    ])

    const xml = useMemo(
        () =>
            renderStyledQrSvg(value, {
                hideLogo: false,
                moduleShape: 'dot',
                logoOverrideUrl,
            }),
        [value, logoOverrideUrl],
    )

    return (
        <Pressable onLongPress={handleLongPress} delayLongPress={300}>
            <ViewShot
                ref={viewShotRef}
                options={{ format: 'png', fileName: 'fedi-qr-code.png' }}>
                <Animated.View
                    style={[
                        style.container,
                        { width: size, height: size, padding: animatedPadding },
                    ]}>
                    <SvgXml xml={xml} />
                </Animated.View>
            </ViewShot>
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',
            backgroundColor: theme.colors.white,
            borderRadius: 16,
        },
    })

export default QRCode
