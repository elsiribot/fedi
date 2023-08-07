import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useIsOfflineWalletSupported } from '@fedi/common/hooks/federation'

import {
    OmniInput,
    OmniInputAction,
} from '../components/feature/omni/OmniInput'
import { ParsedBolt11, ParsedLnurlPay, ParserDataType } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Send'>

const Send: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const showOfflineWallet = useIsOfflineWalletSupported()

    const { navigate } = navigation

    // Redirect the user to another screen to handle the parsed payment
    // TODO: Redirect user to different screen for on chain when re-enabled
    const handleOmniInput = useCallback(
        (parsedData: ParsedBolt11 | ParsedLnurlPay) => {
            navigate('ConfirmSendLightning', { parsedData })
        },
        [navigate],
    )

    const customActions: OmniInputAction[] = useMemo(() => {
        if (!showOfflineWallet) return []
        return [
            {
                label: t('feature.send.send-bitcoin-offline'),
                icon: 'Offline',
                onPress: () => navigate('SendOfflineAmount'),
            },
        ]
    }, [showOfflineWallet, t, navigate])

    return (
        <SafeAreaView
            edges={['bottom', 'left', 'right']}
            style={styles(theme).container}>
            <OmniInput
                expectedInputTypes={[
                    ParserDataType.Bolt11,
                    ParserDataType.LnurlPay,
                ]}
                onExpectedInput={handleOmniInput}
                onUnexpectedSuccess={() => null}
                customActions={customActions}
            />
        </SafeAreaView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            width: '100%',
            padding: theme.spacing.lg,
        },
    })

export default Send
