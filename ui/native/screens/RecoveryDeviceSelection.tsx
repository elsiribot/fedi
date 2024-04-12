import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'

import { selectRegisteredDevices } from '@fedi/common/redux'
import { RpcRegisteredDevice } from '@fedi/common/types/bindings'
import dateUtils from '@fedi/common/utils/DateUtils'
import { hexToRgba } from '@fedi/common/utils/color'

import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'RecoveryDeviceSelection'
>

const RecoveryDeviceSelection: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const registeredDevices = useAppSelector(selectRegisteredDevices)

    const style = styles(theme)

    const renderDevice = (device: RpcRegisteredDevice, index: number) => {
        // TODO: make device name more human-readable
        const deviceName = device.deviceIdentifier
        const iconName = device.deviceIdentifier.includes(':Web:')
            ? 'DeviceBrowser'
            : device.deviceIdentifier.includes('iPhone')
            ? 'DeviceIos'
            : 'DeviceAndroid'
        const lastSeen = `${t(
            'phrases.last-seen',
        )}: ${dateUtils.formatDeviceRegistrationTimestamp(
            device.lastRegistrationTimestamp,
        )}`
        return (
            <Pressable
                key={`di-${index}`}
                style={style.actionCardContainer}
                onPress={() => {
                    console.debug('device', device)
                    // TODO: call transferDevice RPC after confirmation from user
                }}>
                <View style={style.roundIconContainer}>
                    <SvgImage name={iconName} size={SvgImageSize.sm} />
                </View>
                <View style={style.actionCardTextContainer}>
                    <Text medium numberOfLines={1}>
                        {deviceName}
                    </Text>
                    <Text
                        small
                        numberOfLines={1}
                        style={{ color: theme.colors.darkGrey }}>
                        {lastSeen}
                    </Text>
                </View>
                <View style={style.arrowContainer}>
                    <SvgImage name="ArrowRight" size={SvgImageSize.sm} />
                </View>
            </Pressable>
        )
    }

    return (
        <View style={style.container}>
            <View style={style.contentContainer}>
                <Text caption>
                    {t('feature.recovery.select-a-device-guidance')}
                </Text>
            </View>
            <View style={style.optionsContainer}>
                {registeredDevices.map(renderDevice)}
            </View>
            <Button
                type="clear"
                title={t('feature.recovery.create-a-new-wallet-instead')}
                onPress={() => navigation.navigate('RecoveryNewWallet')}
            />
            {/* TODO: build confirmation overlay */}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            padding: theme.spacing.lg,
            gap: 24,
        },
        contentContainer: {
            alignItems: 'center',
            gap: 16,
        },
        optionsContainer: { alignItems: 'center', width: '100%', gap: 16 },
        actionCardContainer: {
            padding: theme.spacing.md,
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.offWhite,
            borderRadius: 16,
            gap: 10,
        },
        roundIconContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.secondary,
            height: 40,
            width: 40,
            borderRadius: 20,
            shadowOpacity: 1,
            shadowColor: hexToRgba(theme.colors.night, 0.1),
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
        },
        actionCardTextContainer: {
            alignItems: 'flex-start',
            gap: 2,
            maxWidth: '70%',
        },
        arrowContainer: { marginLeft: 'auto' },
    })

export default RecoveryDeviceSelection
