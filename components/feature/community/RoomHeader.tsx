import { useNavigation, useRoute } from '@react-navigation/native'
import { Image, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { Images } from '../../../assets/images'
import Header from '../../ui/Header'

import { t } from 'i18next'
import { Props as RoomProps } from '../../../screens/Room'
import { NavigationHook } from '../../../types/navigation'

type RoomRouteProp = RoomProps['route']

const RoomHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const route = useRoute<RoomRouteProp>()
    const { room } = route.params
    // Mocked roomLink format: fedi:room:uniqueRoomId::userDefinedRoomName
    // If userDefinedRoomName is not provided, assume it is a new room
    // TODO: Determine if this is a 1on1 chat and show other username instead
    const roomName = room.name || t('feature.community.new-room')

    return (
        <Header
            backButton
            containerStyle={styles(theme).container}
            centerContainerStyle={styles(theme).headerCenterContainer}
            headerCenter={
                <Pressable
                    style={styles(theme).roomNameContainer}
                    onPress={() => {
                        navigation.navigate('RoomAdmin', { room })
                    }}>
                    <Image
                        style={styles(theme).roomIcon}
                        source={Images.NewRoom}
                    />
                    <Text bold>{roomName}</Text>
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
