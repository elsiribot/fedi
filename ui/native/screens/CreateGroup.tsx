import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input, Switch, Text, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import SvgImage, { SvgImageSize } from '../components/ui/SvgImage'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useXmpp } from '../state/hooks/chat'
import { Group } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'CreateGroup'>

const CreateGroup: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const [groupName, setGroupName] = useState<string>('')
    const [creatingGroup, setCreatingGroup] = useState<boolean>(false)
    const [broadcastOnly, setBroadcastOnly] = useState<boolean>(false)
    const { enterMucRoom, getUniqueGroupId } = useXmpp()
    const { toast } = useEnvironmentContext().state

    const handleSubmit = async () => {
        if (groupName) {
            setCreatingGroup(true)
        }
    }

    const handleCreateGroup = useCallback(async () => {
        try {
            const groupId = await getUniqueGroupId()
            const groupLink = Group.encodeInvitationLink(groupId)
            const group = new Group({
                id: groupId,
                name: groupName,
                invitationCode: groupLink,
                broadcastOnly,
            })
            const enteredGroup = await enterMucRoom(group)
            console.info('group created', enteredGroup)
            navigation.replace('GroupChat', { group })
        } catch (error) {
            console.error(error)
            console.error('group create failed', error)
            toast?.show(error as string, 3000)
        }
        setCreatingGroup(false)
    }, [enterMucRoom, getUniqueGroupId, groupName, navigation, toast])

    useEffect(() => {
        if (creatingGroup === true) {
            handleCreateGroup()
        }
    }, [
        creatingGroup,
        enterMucRoom,
        getUniqueGroupId,
        groupName,
        handleCreateGroup,
        navigation,
        toast,
    ])

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
            padding: theme.spacing.xl,
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
        },
        textInputInner: {
            borderBottomWidth: 0,
            marginTop: theme.spacing.xs,
        },
        textInputOuter: {
            width: '100%',
            borderColor: theme.colors.primaryVeryLight,
            borderWidth: 1,
            borderRadius: theme.borders.defaultRadius,
        },
    })

export default CreateGroup
