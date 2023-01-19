import { useNavigation, useRoute } from '@react-navigation/native'
import { Image, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { Images } from '../../../assets/images'
import Header from '../../ui/Header'

import { t } from 'i18next'
import { Props as DirectChatProps } from '../../../screens/DirectChatProps'
import { Props as RoomChatProps } from '../../../screens/RoomChat'
import { NavigationHook } from '../../../types/navigation'
import HoloAvatar from '../../ui/HoloAvatar'

type RoomRouteProp = RoomChatProps['route']

const RoomHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const route = useRoute<RoomRouteProp | DirectChatProps>()
    const { room, member } = route.params
    console.info('room', room)
    console.info('member', member)
    // Mocked roomLink format: fedi:room:uniqueRoomId::userDefinedRoomName
    // If userDefinedRoomName is not provided, assume it is a new room
    const headerImage = room ? (
        <Image style={styles(theme).roomIcon} source={Images.NewRoom} />
    ) : (
        <HoloAvatar title={member.username.substring(0, 1)} />
    )
    const headerText = room
        ? room.name || t('feature.community.new-room')
        : member.username

    return (
        <Header
            backButton
            containerStyle={styles(theme).container}
            centerContainerStyle={styles(theme).headerCenterContainer}
            headerCenter={
                <Pressable
                    // if this is a DirectChat, header press is disabled
                    disabled={room === undefined}
                    style={styles(theme).roomNameContainer}
                    onPress={() => {
                        navigation.navigate('RoomAdmin', { room })
                    }}>
                    {headerImage}
                    <Text bold>{headerText}</Text>
                </Pressable>
            }
            rightContainerStyle={styles(theme).headerRightContainer}
            headerRight={
                <>
                    <Pressable
                        disabled
                        onPress={() => {}}
                        style={styles(theme).headerIconContainer}>
                        <Image
                            style={styles(theme).headerIcon}
                            source={Images.Video}
                        />
                    </Pressable>
                    <Pressable
                        disabled
                        onPress={() => {}}
                        style={styles(theme).headerIconContainer}>
                        <Image
                            style={styles(theme).headerIcon}
                            source={Images.Phone}
                        />
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
        roomIcon: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
            marginRight: theme.spacing.sm,
        },
        roomNameContainer: {
            padding: theme.spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
        },
    })

export default RoomHeader
