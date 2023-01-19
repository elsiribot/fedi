import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Icon, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { Images } from '../assets/images'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'RoomInvite'>

const QR_CODE_SIZE = Dimensions.get('window').width * 0.7

const RoomInvite: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { room } = route.params

    const copyToClipboard = () => {
        Clipboard.setString(room.invitationCode as string)
    }

    const viewRoom = () => {
        console.info(room)
        navigation.navigate('RoomChat', { room })
    }

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).qrCodeContainer}>
                <QRCode
                    value={room.invitationCode}
                    size={QR_CODE_SIZE}
                    logo={Images.FediQrLogo}
                />
            </View>
            <View style={styles(theme).copyInviteLinkContainer}>
                <Text style={styles(theme).inviteLinkText} numberOfLines={1}>
                    {room.invitationCode}
                </Text>
                <TouchableOpacity
                    style={styles(theme).copyButtonContainer}
                    onPress={copyToClipboard}>
                    <Icon
                        name="content-copy"
                        type="material"
                        color={theme.colors.primary}
                        size={theme.sizes.xxs}
                    />
                    <Text style={styles(theme).copyText} numberOfLines={1}>
                        {t('words.copy')}
                    </Text>
                </TouchableOpacity>
            </View>
            <Text style={styles(theme).inviteLinkNotice} numberOfLines={2}>
                {t('feature.community.invite-link-notice')}
            </Text>
            <Button
                fullWidth
                containerStyle={styles(theme).buttonContainer}
                titleStyle={styles(theme).buttonTitle}
                buttonStyle={styles(theme).button}
                title={t('feature.community.view-room')}
                onPress={viewRoom}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.xl,
            // TODO: Add react-linear-gradient-package and use
            // dark holo background instead of primary black
            backgroundColor: theme.colors.primary,
        },
        qrCodeContainer: {
            borderRadius: theme.borders.defaultRadius,
            backgroundColor: theme.colors.secondary,
            padding: QR_CODE_SIZE * 0.05,
            marginVertical: theme.spacing.xl,
            flexDirection: 'row',
            justifyContent: 'center',
        },
        copyInviteLinkContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            width: QR_CODE_SIZE * 1.1,
            backgroundColor: theme.colors.secondary,
            borderRadius: theme.borders.defaultRadius,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.md,
        },
        copyButtonContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            width: '15%',
        },
        inviteLinkText: {
            width: '85%',
            color: theme.colors.primaryLight,
            fontSize: theme.sizes.xxs,
        },
        copyText: {
            color: theme.colors.primary,
            fontSize: theme.sizes.xxs,
            paddingLeft: theme.spacing.xs,
        },
        inviteLinkNotice: {
            color: theme.colors.secondary,
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.xl,
            marginHorizontal: theme.spacing.md,
            textAlign: 'center',
        },
        button: {
            backgroundColor: theme.colors.secondary,
        },
        buttonContainer: {
            marginTop: 'auto',
        },
        buttonTitle: {
            color: theme.colors.primary,
        },
    })

export default RoomInvite
