import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input, Switch, Text, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useToast } from '@fedi/common/hooks/toast'
import { createMatrixRoom } from '@fedi/common/redux'
import { ChatType } from '@fedi/common/types'
import { makeLog } from '@fedi/common/utils/log'

import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { useAppDispatch } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

const log = makeLog('CreateGroup')

export type Props = NativeStackScreenProps<RootStackParamList, 'CreateGroup'>

const CreateGroup: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const [groupName, setGroupName] = useState<string>(
        t('feature.chat.new-group'),
    )
    const [creatingGroup, setCreatingGroup] = useState<boolean>(false)
    const [broadcastOnly, setBroadcastOnly] = useState<boolean>(false)
    const toast = useToast()

    const handleCreateGroup = useCallback(async () => {
        setCreatingGroup(true)
        try {
            const { roomId } = await dispatch(
                createMatrixRoom({
                    name: groupName,
                    broadcastOnly,
                }),
            ).unwrap()
            log.info('group created', roomId)
            navigation.replace('ChatRoomConversation', {
                roomId,
                chatType: ChatType.group,
            })
        } catch (error) {
            log.error('group create failed', error)
            toast.error(t, error)
        }
        setCreatingGroup(false)
    }, [broadcastOnly, dispatch, groupName, navigation, toast, t])

    const handleSubmit = async () => {
        if (groupName) {
            handleCreateGroup()
        }
    }

    return (
        <View style={styles(theme).container}>
            <SvgImage name="NewRoom" size={SvgImageSize.lg} />
            <View style={styles(theme).inputWrapper}>
                <Input
                    onChangeText={setGroupName}
                    value={groupName}
                    placeholder={`${t('feature.chat.group-name')}`}
                    returnKeyType="done"
                    containerStyle={styles(theme).textInputOuter}
                    inputContainerStyle={styles(theme).textInputInner}
                    autoCapitalize={'none'}
                    autoCorrect={false}
                />
            </View>
            <View style={styles(theme).switchWrapper}>
                <Text style={styles(theme).inputLabel}>
                    {t('feature.chat.broadcast-only')}
                </Text>
                <Switch
                    value={broadcastOnly}
                    onValueChange={value => setBroadcastOnly(value)}
                />
            </View>
            <Button
                fullWidth
                title={t('phrases.save-changes')}
                onPress={handleSubmit}
                loading={creatingGroup}
                disabled={!groupName || creatingGroup}
                containerStyle={styles(theme).button}
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
            padding: theme.spacing.lg,
        },
        button: {
            marginTop: 'auto',
        },
        inputWrapper: {
            width: '100%',
            marginTop: theme.spacing.xl,
        },
        inputLabel: {
            textAlign: 'left',
            marginLeft: theme.spacing.sm,
            marginBottom: theme.spacing.xs,
        },
        switchWrapper: {
            marginTop: theme.spacing.xl,
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 10,
        },
        textInputInner: {
            // borderBottomWidth: 0,
            textAlignVertical: 'center',
            borderColor: theme.colors.primaryVeryLight,
            borderWidth: 1,
            borderRadius: theme.borders.defaultRadius,
            padding: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
        },
        textInputOuter: {
            width: '100%',
        },
    })

export default CreateGroup
