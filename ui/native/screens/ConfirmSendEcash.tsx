import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Divider, Text, Theme } from '@rneui/themed'
import { useTheme } from '@rneui/themed'
import { Button } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Keyboard, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import { useBtcFiatPrice } from '@fedi/common/hooks/amount'
import { increaseStableBalance, selectMaximumAPR } from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { formatErrorMessage } from '@fedi/common/utils/format'
import { makeLog } from '@fedi/common/utils/log'

import { fedimint } from '../bridge'
import { CurrencyAvatar } from '../components/feature/stabilitypool/CurrencyAvatar'
import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector, useBridge } from '../state/hooks'
import { Sats } from '../types'
import type { RootStackParamList } from '../types/navigation'

const log = makeLog('ConfirmSendEcash')

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ConfirmSendEcash'
>

const ConfirmSendEcash: React.FC<Props> = ({ route, navigation }) => {
    const { theme } = useTheme()
    const insets = useSafeAreaInsets()
    const { t } = useTranslation()
    const { amount } = route.params
    const [showDetails, setShowDetails] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const { toast } = useEnvironmentContext().state
    const { generateEcash } = useBridge()

    const onGenerateEcash = async () => {
        setIsLoading(true)
        try {
            const millis = amountUtils.satToMsat(Number(amount) as Sats)
            const { ecash } = await generateEcash(millis)
            navigation.navigate('SendOfflineQr', { ecash, amount: millis })
        } catch (error) {
            log.error('onGenerateEcash', error)
        }
        setIsLoading(false)
    }

    const continueSend = () => {
        Keyboard.dismiss()
        onGenerateEcash()
    }

    const onConfirm = () => {
        Alert.alert(
            t('phrases.please-confirm'),
            t('feature.send.offline-send-warning'),
            [
                {
                    text: t('phrases.go-back'),
                },
                {
                    text: t('words.continue'),
                    onPress: continueSend,
                },
            ],
        )
    }

    const style = styles(theme, insets)

    return (
        <View style={style.container}>
            <View style={style.buttonsGroup}>
                <Button
                    fullWidth
                    containerStyle={[style.button]}
                    buttonStyle={[style.detailsButton]}
                    onPress={() => setShowDetails(!showDetails)}
                    title={
                        <Text medium caption>
                            {showDetails
                                ? t('phrases.hide-details')
                                : t('feature.stabilitypool.details-and-fee')}
                        </Text>
                    }
                />
                <Button
                    fullWidth
                    containerStyle={[style.button]}
                    onPress={onConfirm}
                    disabled={isLoading}
                    loading={isLoading}
                    title={
                        <Text medium caption style={style.buttonText}>
                            {t('words.deposit')}
                        </Text>
                    }
                />
            </View>
        </View>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        container: {
            flexDirection: 'column',
            flex: 1,
            alignItems: 'center',
            paddingTop: theme.spacing.lg,
            paddingLeft: theme.spacing.lg + insets.left,
            paddingRight: theme.spacing.lg + insets.right,
            paddingBottom: Math.max(theme.spacing.lg, insets.bottom),
        },
        amountText: {
            marginTop: 'auto',
        },
        buttonsGroup: {
            width: '100%',
            marginTop: 'auto',
            flexDirection: 'column',
        },
        button: {
            marginTop: theme.spacing.lg,
        },
        buttonText: {
            color: theme.colors.secondary,
        },
        conversionIndicator: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
        },
        collapsedContainer: {
            height: 0,
            opacity: 0,
        },
        detailsContainer: {
            width: '100%',
            opacity: 1,
            flexDirection: 'column',
        },
        detailItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 52,
        },
        darkGrey: {
            color: theme.colors.darkGrey,
        },
        detailsButton: {
            backgroundColor: theme.colors.offWhite,
        },
    })

export default ConfirmSendEcash
