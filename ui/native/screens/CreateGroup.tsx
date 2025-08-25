import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input, Switch, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useCreateMatrixRoom } from '@fedi/common/hooks/matrix'
import { ChatType, MatrixRoom } from '@fedi/common/types'

import Avatar, { AvatarSize } from '../components/ui/Avatar'
import Flex from '../components/ui/Flex'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'CreateGroup'>

const CreateGroup: React.FC<Props> = ({ navigation, route }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const defaultGroup = route.params?.defaultGroup || undefined
    const {
        handleCreateGroup,
        isCreatingGroup,
        groupName,
        setGroupName,
        broadcastOnly,
        setBroadcastOnly,
        isPublic,
        setIsPublic,
        errorMessage,
    } = useCreateMatrixRoom(t, (roomId: MatrixRoom['id']) => {
        navigation.replace('ChatRoomConversation', {
            roomId,
            chatType: ChatType.group,
        })
    })

    // Forces default groups to be broadcast-only & public
    // TODO: support nonbroadcast/nonpublic default groups
    useEffect(() => {
        if (defaultGroup === true) {
            setBroadcastOnly(true)
            setIsPublic(true)
        }
    }, [defaultGroup, setBroadcastOnly, setIsPublic])

    const icon = useMemo(() => {
        return broadcastOnly ? 'SpeakerPhone' : 'SocialPeople'
    }, [broadcastOnly])

    const style = styles(theme)

    return (
        <Flex grow center style={style.container}>
            <Avatar id={''} icon={icon} size={AvatarSize.md} />
            <View style={style.inputWrapper}>
                <Input
                    onChangeText={setGroupName}
                    value={groupName}
                    maxLength={30}
                    placeholder={`${t('feature.chat.group-name')}`}
                    returnKeyType="done"
                    containerStyle={style.textInputOuter}
                    inputContainerStyle={style.textInputInner}
                    autoCapitalize={'none'}
                    autoCorrect={false}
                    selectTextOnFocus
                />
                {errorMessage && (
                    <Text
                        caption
                        style={[style.errorLabel, style.maxLengthError]}>
                        {errorMessage}
                    </Text>
                )}
            </View>
            <Flex
                row
                align="center"
                justify="between"
                fullWidth
                style={style.switchWrapper}>
                <Text style={style.inputLabel}>
                    {t('feature.chat.broadcast-only')}
                </Text>
                <Switch
                    value={broadcastOnly}
                    onValueChange={value => {
                        // for now default groups must be public
                        if (defaultGroup === true) return
                        setBroadcastOnly(value)
                    }}
                />
            </Flex>
            <Flex
                row
                align="center"
                justify="between"
                fullWidth
                style={style.switchWrapper}>
                <Text style={style.inputLabel}>{t('words.public')}</Text>
                <Switch
                    value={isPublic}
                    onValueChange={value => {
                        // for now default groups must be public
                        if (defaultGroup === true) return
                        setIsPublic(value)
                    }}
                />
            </Flex>
            {isPublic && (
                <Text caption style={style.errorLabel}>
                    {t('feature.chat.public-group-warning')}
                </Text>
            )}
            <Button
                fullWidth
                title={t('phrases.save-changes')}
                onPress={handleCreateGroup}
                loading={isCreatingGroup}
                disabled={!groupName || isCreatingGroup || !!errorMessage}
                containerStyle={style.button}
            />
        </Flex>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            padding: theme.spacing.lg,
        },
        button: {
            marginTop: 'auto',
        },
        errorLabel: {
            textAlign: 'left',
            marginTop: theme.spacing.sm,
            color: theme.colors.red,
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
        maxLengthError: {
            paddingHorizontal: theme.spacing.lg,
        },
    })

export default CreateGroup
