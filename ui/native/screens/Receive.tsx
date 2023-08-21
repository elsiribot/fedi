import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { OmniInput } from '../components/feature/omni/OmniInput'
import { ParserDataType } from '../types'
import { NavigationHook, RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Receive'>

const Receive: React.FC<Props> = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()

    return (
        <SafeAreaView
            edges={['bottom', 'left', 'right']}
            style={styles(theme).container}>
            <OmniInput
                expectedInputTypes={[
                    ParserDataType.LnurlWithdraw,
                    ParserDataType.FedimintEcash,
                    ParserDataType.FediChatMember,
                ]}
                onExpectedInput={parsedData => {
                    if (parsedData.type === ParserDataType.LnurlWithdraw) {
                        navigation.navigate('ReceiveLightning', { parsedData })
                    } else if (
                        parsedData.type === ParserDataType.FedimintEcash
                    ) {
                        navigation.navigate('ConfirmReceiveOffline', {
                            ecash: parsedData.data.token,
                        })
                    } else if (
                        parsedData.type === ParserDataType.FediChatMember
                    ) {
                        navigation.navigate('ChatWallet', {
                            recipientId: parsedData.data.id,
                        })
                    }
                }}
                onUnexpectedSuccess={() => {
                    navigation.canGoBack()
                        ? navigation.goBack()
                        : navigation.navigate('TabsNavigator')
                }}
                customActions={[
                    {
                        label: t('feature.receive.create-lightning-request'),
                        icon: 'QrLightning',
                        onPress: () => navigation.navigate('ReceiveLightning'),
                    },
                ]}
            />
        </SafeAreaView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            padding: theme.spacing.lg,
            width: '100%',
        },
    })

export default Receive
