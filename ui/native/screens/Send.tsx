import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useIsOfflineWalletSupported } from '@fedi/common/hooks/federation'

import {
    OmniInput,
    OmniInputAction,
} from '../components/feature/omni/OmniInput'
import { ParserDataType } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Send'>

const Send: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const showOfflineWallet = useIsOfflineWalletSupported()

    const { navigate } = navigation

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
                    ParserDataType.FediChatMember,
                ]}
                onExpectedInput={parsedData => {
                    if (parsedData.type === ParserDataType.FediChatMember) {
                        navigate('ChatWallet', {
                            recipientId: parsedData.data.id,
                        })
                    } else {
                        navigate('ConfirmSendLightning', { parsedData })
                    }
                }}
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
