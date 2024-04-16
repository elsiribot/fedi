import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useToast } from '@fedi/common/hooks/toast'

import { OmniInput } from '../components/feature/omni/OmniInput'
import { ParserDataType } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'ScanMemberCode'>

const ScanMemberCode: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const toast = useToast()

    const style = styles()

    return (
        <View style={style.container}>
            <OmniInput
                expectedInputTypes={[
                    ParserDataType.LegacyFediChatMember,
                    ParserDataType.FediChatUser,
                ]}
                onExpectedInput={parsedData => {
                    if (
                        parsedData.type === ParserDataType.LegacyFediChatMember
                    ) {
                        return toast.show({
                            content: t('feature.omni.unsupported-legacy-chat'),
                            status: 'error',
                        })
                    }
                    if (parsedData.type === ParserDataType.FediChatUser) {
                        navigation.replace('ChatUserConversation', {
                            userId: parsedData.data.id,
                        })
                    }
                }}
                onUnexpectedSuccess={() =>
                    navigation.canGoBack()
                        ? navigation.goBack()
                        : navigation.navigate('TabsNavigator')
                }
            />
        </View>
    )
}

const styles = () =>
    StyleSheet.create({
        container: {
            flex: 1,
            width: '100%',
            flexDirection: 'column',
        },
    })

export default ScanMemberCode
