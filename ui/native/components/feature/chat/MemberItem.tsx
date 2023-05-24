import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { jidToId } from '@fedi/common/utils/chat'

import { Member } from '../../../types'
import Avatar, { AvatarSize } from '../../ui/Avatar'

type MemberItemProps = {
    member: Member
    selectMember: (member: Member) => void
}

const MemberItem: React.FC<MemberItemProps> = ({
    member,
    selectMember,
}: MemberItemProps) => {
    const { theme } = useTheme()

    return (
        <Pressable
            style={[styles(theme).container]}
            onPress={() => {
                selectMember(member)
            }}>
            <Avatar
                id={jidToId(member.jid)}
                name={member.username}
                size={AvatarSize.md}
            />
            <Text numberOfLines={1} bold style={[styles(theme).usernameText]}>
                {member.username}
            </Text>
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingVertical: theme.spacing.sm,
        },
        usernameText: {
            marginLeft: theme.spacing.md,
            width: '80%',
        },
    })

export default MemberItem
