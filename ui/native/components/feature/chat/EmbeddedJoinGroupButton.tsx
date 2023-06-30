import Clipboard from '@react-native-clipboard/clipboard'
import { useNavigation } from '@react-navigation/native'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { fetchGroupConfig } from '@fedi/common/redux'
import { encodeGroupInvitationLink } from '@fedi/common/utils/xmpp'

import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type Props = {
    groupId: string
}

const EmbeddedJoinGroupButton: React.FC<Props> = ({ groupId }: Props) => {
    const navigation = useNavigation<NavigationHook>()
    const dispatch = useAppDispatch()
    const federationId = useAppSelector(s => s.federation.activeFederationId)
    const { toast } = useEnvironmentContext().state
    const { t } = useTranslation()
    const { theme } = useTheme()
    const [groupName, setGroupName] = useState<string>('')

    const copyToClipboard = () => {
        const invitationLink = encodeGroupInvitationLink(groupId)
        Clipboard.setString(invitationLink as string)
        toast?.show(t('feature.chat.copied-group-invite-code'), 3000)
    }

    useEffect(() => {
        const refreshGroupName = async () => {
            if (federationId && groupId) {
                const groupConfig = await dispatch(
                    fetchGroupConfig({ federationId, groupId }),
                ).unwrap()
                setGroupName(groupConfig.name as string)
            }
        }
        refreshGroupName()
    }, [dispatch, federationId, groupId])

    return (
        <Button
            size="sm"
            color={theme.colors.secondary}
            containerStyle={styles(theme).container}
            onPress={() => navigation.navigate('GroupChat', { groupId })}
            onLongPress={copyToClipboard}
            title={
                <View style={styles(theme).contents}>
                    <SvgImage
                        containerStyle={styles(theme).icon}
                        name="SocialPeople"
                        size={SvgImageSize.xs}
                    />
                    <Text medium caption>
                        {`${t('words.join')} `}
                    </Text>
                    <Text
                        bold
                        caption
                        numberOfLines={1}
                        style={styles(theme).groupNameText}>
                        {`${groupName}`}
                    </Text>
                </View>
            }
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {},
        contents: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '100%',
        },
        icon: {
            marginRight: theme.spacing.sm,
        },
        groupNameText: {
            maxWidth: '70%',
        },
    })

export default EmbeddedJoinGroupButton
