import { RouteProp, useRoute } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import {
    selectChatConnectionOptions,
    selectChatMember,
} from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import { RootStackParamList } from '../../../types/navigation'
import Avatar from '../../ui/Avatar'
import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'

type DirectChatRouteProp = RouteProp<RootStackParamList, 'DirectChat'>

const DirectChatHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const route = useRoute<DirectChatRouteProp>()
    const { memberId: memberIdParam } = route.params

    // Check for missing domain in case we scan an old member QR
    let memberId = memberIdParam
    const connectionOptions = useAppSelector(selectChatConnectionOptions)
    if (!memberId.includes('@') && connectionOptions) {
        const { domain } = connectionOptions
        memberId = `${memberId}@${domain}`
    }
    const member = useAppSelector(s => selectChatMember(s, memberId))
    const username = member?.username || memberId.split('@')[0] || ''

    return (
        <Header
            backButton
            containerStyle={styles(theme).container}
            centerContainerStyle={styles(theme).headerCenterContainer}
            headerCenter={
                <Pressable
                    disabled
                    style={styles(theme).memberContainer}
                    onPress={() => {
                        // TODO: implement admin settings for 1on1 chat
                        // navigation.navigate('GroupAdmin', { group })
                    }}>
                    <Avatar id={member?.id || ''} name={username} />
                    <Text
                        bold
                        numberOfLines={1}
                        style={styles(theme).memberText}>
                        {username}
                    </Text>
                </Pressable>
            }
            rightContainerStyle={styles(theme).headerRightContainer}
            headerRight={
                <>
                    <Pressable
                        disabled
                        onPress={() => {}}
                        style={styles(theme).headerIconContainer}>
                        <SvgImage name="Video" />
                    </Pressable>
                    <Pressable
                        disabled
                        onPress={() => {}}
                        style={styles(theme).headerIconContainer}>
                        <SvgImage name="Phone" />
                    </Pressable>
                </>
            }
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            marginTop: theme.spacing.md,
        },
        headerCenterContainer: {
            flex: 6,
            justifyContent: 'flex-start',
        },
        headerRightContainer: {
            flex: 3,
            flexDirection: 'row',
            justifyContent: 'flex-end',
        },
        headerIconContainer: {
            padding: theme.spacing.sm,
            // Disabled
            opacity: 0.25,
        },
        headerIcon: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        memberText: {
            marginLeft: theme.spacing.sm,
        },
        memberContainer: {
            width: '95%',
            padding: theme.spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
        },
    })

export default DirectChatHeader
