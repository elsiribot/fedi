import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import { useToast } from '@fedi/common/hooks/toast'

import { selectActiveFederationId } from '@fedi/common/redux'
import HoloLoader from '../components/ui/HoloLoader'
import { PressableIcon } from '../components/ui/PressableIcon'
import { useAppSelector, useBridge } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'NostrKeys'>

const NostrKeys: React.FC<Props> = (_: Props) => {
    const { t } = useTranslation()
    const activeFederationId = useAppSelector(selectActiveFederationId)
    const { getNostrSecret, getNostrPubkey } = useBridge(activeFederationId)
    const { theme } = useTheme()
    const insets = useSafeAreaInsets()

    const [npub, setNpub] = useState<null | string>(null)
    const [nsec, setNsec] = useState<null | string>(null)
    const [showNsec, setShowNsec] = useState(false)

    useEffect(() => {
        Promise.all([getNostrSecret(), getNostrPubkey()]).then(
            ([{ nsec: fediNsec }, { npub: fediNpub }]) => {
                setNsec(fediNsec)
                setNpub(fediNpub)
            },
        )
    }, [getNostrSecret, getNostrPubkey])

    const style = styles(theme, insets)

    return (
        <View style={style.container}>
            <View style={style.section}>
                <View style={style.header}>
                    <Text medium>{t('feature.nostr.nostr-public-key')}</Text>
                    <CopyButton value={npub ?? ''} />
                </View>
                {typeof npub === 'string' ? (
                    <Text
                        caption
                        color={theme.colors.darkGrey}
                        numberOfLines={1}
                        ellipsizeMode="middle">
                        {npub}
                    </Text>
                ) : (
                    <HoloLoader size={32} />
                )}
            </View>
            <View style={style.section}>
                <View style={style.header}>
                    <Text medium>{t('feature.nostr.nostr-secret-key')}</Text>
                    {typeof nsec === 'string' && (
                        <View style={style.iconSpacer}>
                            <PressableIcon
                                onPress={() => setShowNsec(!showNsec)}
                                svgProps={{
                                    size: 16,
                                    color: theme.colors.grey,
                                }}
                                svgName={showNsec ? 'EyeClosed' : 'Eye'}
                                containerStyle={style.pressableIcon}
                            />
                            <CopyButton value={nsec} />
                        </View>
                    )}
                </View>
                {typeof nsec === 'string' ? (
                    <Text
                        caption
                        color={theme.colors.darkGrey}
                        numberOfLines={1}
                        ellipsizeMode={showNsec ? 'middle' : 'clip'}>
                        {showNsec ? nsec : '•'.repeat(63)}
                    </Text>
                ) : (
                    <HoloLoader size={32} />
                )}
            </View>
        </View>
    )
}

function CopyButton({ value }: { value: string }) {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const toast = useToast()

    return (
        <PressableIcon
            svgName="Copy"
            svgProps={{ size: 16, color: theme.colors.grey }}
            onPress={() => {
                if (!value) return
                Clipboard.setString(value)
                toast.show({
                    status: 'success',
                    content: t('phrases.copied-to-clipboard'),
                })
            }}
        />
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        container: {
            flex: 1,
            width: '100%',
            flexDirection: 'column',
            gap: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            paddingLeft: insets.left + theme.spacing.lg,
            paddingRight: insets.right + theme.spacing.lg,
            paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
        },
        section: {
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
        },
        header: {
            display: 'flex',
            gap: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        iconSpacer: {
            flex: 1,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        switchContainer: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 8,
        },
        content: {
            flex: 1,
            flexDirection: 'column',
            gap: 16,
        },
        textInputInner: {
            borderBottomWidth: 0,
            height: '100%',
        },
        textInputOuter: {
            width: '100%',
            borderColor: theme.colors.primaryVeryLight,
            borderWidth: 1,
            borderRadius: 8,
            height: 36,
        },
        input: {
            fontSize: 14,
        },
        card: {
            borderColor: theme.colors.lightGrey,
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
        },
        pressableIcon: {
            width: 'auto',
            flexGrow: 0,
            flexShrink: 0,
            paddingHorizontal: 4,
            paddingVertical: 4,
        },
        buttonContainer: {
            display: 'flex',
            gap: 8,
            flexDirection: 'row',
        },
        optionButton: {
            flex: 1,
        },
    })

export default NostrKeys
