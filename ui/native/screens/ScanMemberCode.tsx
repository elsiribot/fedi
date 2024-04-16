import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useToast } from '@fedi/common/hooks/toast'
import { inviteUserToMatrixRoom } from '@fedi/common/redux'

import { OmniInput } from '../components/feature/omni/OmniInput'
import { useAppDispatch } from '../state/hooks'
import { ParserDataType } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'ScanMemberCode'>

const ScanMemberCode: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const toast = useToast()
    const { inviteToRoomId } = route.params
    const dispatch = useAppDispatch()

    const handleScanUser = useCallback(
        async (scannedId: string) => {
            if (!inviteToRoomId) {
                return navigation.replace('ChatUserConversation', {
                    userId: scannedId,
                })
            }
            try {
                const result = await dispatch(
                    inviteUserToMatrixRoom({
                        roomId: inviteToRoomId,
                        userId: scannedId,
                    }),
                ).unwrap()
                console.warn('result', result)
                toast.show({
                    status: 'success',
                    content: t('words.invited'),
                })
            } catch (err) {
                console.warn('result', err)
                toast.error(t, 'errors.unknown-error')
            }
            return navigation.canGoBack()
                ? navigation.goBack()
                : navigation.replace('TabsNavigator', {
                      initialRouteName: 'Chat',
                  })
        },
        [navigation, inviteToRoomId],
    )

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
                        // navigation.replace('ChatUserConversation', {
                        //     userId: parsedData.data.id,
                        // })
                        handleScanUser(parsedData.data.id)
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
