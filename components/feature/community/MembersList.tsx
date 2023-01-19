import { useNavigation } from '@react-navigation/native'
import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { FlatList, ListRenderItem, StyleSheet } from 'react-native'

import { Member } from '../../../types'
import { NavigationHook } from '../../../types/navigation'
import MemberItem from './MemberItem'

type MembersListProps = {
    members: Member[]
}

const MembersList: React.FC<MembersListProps> = ({
    members,
}: MembersListProps) => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()

    const openDirectChat = (member: Member) => {
        console.log('member', member)
        // navigation.navigate('DirectChat', { member })
    }

    const renderMember: ListRenderItem<Member> = ({ item }) => {
        return <MemberItem member={item} selectMember={openDirectChat} />
    }

    return (
        <FlatList
            data={members}
            renderItem={renderMember}
            keyExtractor={(item: Member) => `${item.jid.toString()}`}
            style={styles(theme).container}
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            width: '100%',
            paddingHorizontal: theme.spacing.xl,
        },
    })

export default MembersList
