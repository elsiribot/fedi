import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useToast } from '@fedi/common/hooks/toast'
import { inviteUserToMatrixRoom, selectMatrixRoom } from '@fedi/common/redux'
import { makeLog } from '@fedi/common/utils/log'

import { OmniInput } from '../components/feature/omni/OmniInput'
import CustomOverlay, {
    CustomOverlayContents,
} from '../components/ui/CustomOverlay'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import {
    ParsedFediChatUser,
    ParsedLegacyFediChatMember,
    ParserDataType,
} from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'ScanMemberCode'>

const log = makeLog('ScanMemberCode')

const ScanMemberCode: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const toast = useToast()
    const inviteToRoomId = route?.params?.inviteToRoomId
    const room = useAppSelector(
        s => !!inviteToRoomId && selectMatrixRoom(s, inviteToRoomId),
    )
    const roomName = room ? room.name : t('phrases.this-group')
    const isInvitation = !!inviteToRoomId
    const dispatch = useAppDispatch()
    const [scannedUser, setScannedUser] = useState<ParsedFediChatUser | null>(
        null,
    )
    const [isLoading, setIsLoading] = useState(false)

    const handleNavigate = useCallback(() => {
        return navigation.canGoBack()
            ? navigation.goBack()
            : navigation.replace('TabsNavigator', {
                  initialRouteName: 'Chat',
              })
    }, [navigation])

    const handleConfirmation = useCallback(() => {
        if (!isInvitation || !scannedUser) {
            log.warn(`NOOP - NOT adding member to room due to invalid state`)
            toast.show({
                status: 'error',
                content: t('errors.failed-to-invite-to-group'),
            })
            return
        }
        try {
            log.info(
                `Inviting user to matrix room (${scannedUser.data.id} , ${inviteToRoomId}) `,
            )
            setIsLoading(true)
            dispatch(
                inviteUserToMatrixRoom({
                    roomId: inviteToRoomId,
                    userId: scannedUser.data.id,
                }),
            )
                .unwrap()
                .then(() => {
                    toast.show({
                        status: 'success',
                        content: t('words.invited'),
                    })
                    setIsLoading(false)
                    handleNavigate()
                })
                .catch(e => {
                    setIsLoading(false)
                    setScannedUser(null)
                    toast.error(t, e)
                })
        } catch (err) {
            setIsLoading(false)
            setScannedUser(null)
            toast.error(t, err)
        }
    }, [
        dispatch,
        toast,
        t,
        scannedUser,
        setIsLoading,
        setScannedUser,
        handleNavigate,
        inviteToRoomId,
        isInvitation,
    ])

    const handleScannedData = useCallback(
        async (parsedData: ParsedFediChatUser | ParsedLegacyFediChatMember) => {
            if (parsedData.type === ParserDataType.LegacyFediChatMember) {
                // handle legacy chat code
                return toast.show({
                    content: t('feature.omni.unsupported-legacy-chat'),
                    status: 'error',
                })
            } else if (!isInvitation) {
                // If inviteToRoomId is not set, navigate to ChatUserConversation
                return navigation.replace('ChatUserConversation', {
                    userId: parsedData.data.id,
                })
            } else {
                // If inviteToRoomId is set, then prompt the
                // user to confirm to invite the user to the room
                setScannedUser(parsedData)
            }
        },
        [navigation, setScannedUser, toast, t, isInvitation],
    )

    const confirmationContent: CustomOverlayContents = useMemo(
        () => ({
            icon: 'Chat',
            title: t('feature.chat.confirm-add-to-group', { roomName }),
            buttons: [
                {
                    text: t('phrases.go-back'),
                    onPress: () => setScannedUser(null),
                    primary: false,
                },
                {
                    text: t('words.continue'),
                    onPress: handleConfirmation,
                    primary: true,
                },
            ],
        }),
        [setScannedUser, t, handleConfirmation, roomName],
    )

    const style = styles()

    return (
        <View style={style.container}>
            <OmniInput
                expectedInputTypes={[
                    ParserDataType.LegacyFediChatMember,
                    ParserDataType.FediChatUser,
                ]}
                onExpectedInput={handleScannedData}
                onUnexpectedSuccess={() =>
                    navigation.canGoBack()
                        ? navigation.goBack()
                        : navigation.navigate('TabsNavigator')
                }
            />
            {!!scannedUser && (
                <>
                    <CustomOverlay
                        show={!!scannedUser}
                        contents={confirmationContent}
                        loading={isLoading}
                        onBackdropPress={() => setScannedUser(null)}
                    />
                </>
            )}
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
