import Clipboard from '@react-native-clipboard/clipboard'
import { useNavigation } from '@react-navigation/native'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useXmpp } from '../../../state/hooks/chat'
import { Group } from '../../../types'
import { NavigationHook } from '../../../types/navigation'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type Props = {
    group: Group
}

const EmbeddedJoinGroupButton: React.FC<Props> = ({ group }: Props) => {
    const navigation = useNavigation<NavigationHook>()
    const { fetchMucRoomConfig } = useXmpp()
    const { toast } = useEnvironmentContext().state
    const { t } = useTranslation()
    const { theme } = useTheme()
    const [groupName, setGroupName] = useState<string>('')

    const copyToClipboard = () => {
        Clipboard.setString(group.invitationCode as string)
        toast?.show(t('feature.chat.copied-group-invite-code'), 3000)
    }

    useEffect(() => {
        if (group.id) {
            fetchMucRoomConfig(group).then(name => {
                setGroupName(name)
            })
        }
    }, [fetchMucRoomConfig, group])

    return (
        <Button
            size="sm"
            color={theme.colors.secondary}
            containerStyle={styles(theme).container}
            onPress={() => navigation.navigate('GroupChat', { group })}
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
