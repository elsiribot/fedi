import { useNavigation } from '@react-navigation/native'
import { Icon, Image, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import {
    Dimensions,
    FlatList,
    ImageSourcePropType,
    ListRenderItem,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native'

import { Images } from '../../../assets/images'
import Base from '../../../bridge'
import { NavigationHook } from '../../../types/navigation'
import DateUtils from '../../../utils/DateUtils'

// Mock Data Types for Community features
type Room = {
    id: string
    icon: ImageSourcePropType
    name: string
    description?: string
    hasNewMessages: boolean
    pinned: boolean
    settings?: RoomSettings
    // TODO: What exactly is encoded in this invitationCode?
    invitationCode?: string

    // Consider MessagePreview type:
    lastMessage?: MessagePreview
    // or simplify:
    messagePreview?: string
    lastReceivedTimestamp?: number
}

// The only other use case I can imagine for this
// would be for very large Messages where a MessagePreview
// could be sent first before "expanding" it and requesting
// the full Message?
type MessagePreview = {
    text: string
    timestamp: number
    messageId?: string
}

// Consider combining members and admins?
type RoomSettings = {
    members: Member[]
    // What can admins do that members can't (if anything)?
    // Enable payments? Show message history?
    // Consider instead a "creator: Member" field here
    admins: Member[]
    paymentsEnabled: boolean
    // Consider instead a shareMessageHistory boolean
    // because each Member would request and store any Messages
    // from other Members upon joining a Room
    showMessageHistory: boolean
}

export class Member extends Base {
    username: string
    pubkey?: string
}

export class Message extends Base {
    id?: string
    content: string
    sentAt?: number
    receivedAt?: number
    sentBy?: Member
    sentIn?: Room
    actions?: MessageAction[]
    payment?: Payment
}

// This is for embedding action buttons within messages
// May need to make stricter types for this...
type MessageAction = {
    text: string
    handler: () => {}
}

type Payment = {
    amount: number
    status: PaymentStatus
    token?: string
}

enum PaymentStatus {
    requested,
    canceled,
    rejected,
    paid,
}

const MOCKED_ROOMS: Room[] = [
    {
        id: 'r1',
        icon: Images.FediLogoIcon,
        name: 'Fedi',
        pinned: true,
        hasNewMessages: true,
        lastReceivedTimestamp: Date.now() / 1000 - 172800, // 2 days ago
        messagePreview:
            'Welcome to Fedi! This channel will keep you up to date on events happening within your Fedi app',
        lastMessage: {
            timestamp: Date.now() / 1000 - 172800, // 2 days ago
            text: 'Welcome to Fedi! This channel will keep you up to date on events happening within your Fedi app such as:<br><br>- Federation health checks<br>- Scam awareness<br>- Security checks<br>- App updates<br>- Tips & tricks<br>- Education',
        },
    },
    {
        id: 'r2',
        icon: Images.Recovery,
        name: 'Recovery Support',
        pinned: false,
        hasNewMessages: false,
        lastReceivedTimestamp: Date.now() / 1000,
        messagePreview:
            'Could someone please help me get in touch with a guardian so I can',
        lastMessage: {
            timestamp: Date.now() / 1000,
            text: 'Could someone please help me get in touch with a guardian so I can recover my funds??? My phone was stolen it is urgent!',
        },
    },
]

// UI

type RoomTileProps = {
    room: Room
    selectRoom: (room: Room) => void
}

const RoomTile = ({ room, selectRoom }: RoomTileProps) => {
    const { theme } = useTheme()

    return (
        <TouchableOpacity
            style={styles(theme).tileContainer}
            onPress={() => selectRoom(room)}>
            <View style={styles(theme).tileIconContainer}>
                <Image source={room.icon} style={styles(theme).tileIcon} />
            </View>
            <View style={styles(theme).tileContents}>
                <View style={styles(theme).topRow}>
                    <Text>{room.name}</Text>
                    <Text>
                        {DateUtils.formatRoomTileTimestamp(
                            room.lastReceivedTimestamp!,
                        )}
                    </Text>
                </View>
                <View style={styles(theme).bottomRow}>
                    <Text
                        style={styles(theme).messagePreview}
                        numberOfLines={2}>
                        {room.lastMessage?.text || room.messagePreview}
                    </Text>
                    {room.pinned && (
                        <Icon
                            name="pin"
                            type="material-community"
                            size={theme.sizes.xs}
                            containerStyle={styles(theme).pinIcon}
                        />
                    )}
                </View>
            </View>
        </TouchableOpacity>
    )
}

const WINDOW_WIDTH = Dimensions.get('window').width
// const CIRCLE_SIZE = WINDOW_WIDTH * 0.25

const RoomsList: React.FC<{}> = () => {
    const navigation = useNavigation<NavigationHook>()

    const renderRoom: ListRenderItem<Room> = ({ item }) => {
        return (
            <RoomTile
                room={item}
                selectRoom={(room: Room) => {
                    console.log('go to room detail', room.id)
                    navigation.navigate('Room', {
                        roomLink: 'fedi:room:abcdefg',
                    })
                }}
            />
        )
    }

    return (
        <FlatList
            data={MOCKED_ROOMS}
            renderItem={renderRoom}
            keyExtractor={(item: Room) => `${item.id}`}
            // optimization that allows skipping the measurement of dynamic content
            // for fixed-size list items
            getItemLayout={(data, index) => ({
                length: WINDOW_WIDTH,
                offset: 48 * index,
                index,
            })}
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            paddingHorizontal: 24,
        },
        tileContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            height: 64,
            marginVertical: 10,
        },
        tileIcon: {
            height: theme.sizes.md,
            width: theme.sizes.md,
        },
        tileIconContainer: {
            alignItems: 'center',
            width: '20%',
        },
        tileContents: {
            width: '80%',
        },
        topRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
            height: '40%',
        },
        bottomRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            width: '100%',
            height: '60%',
        },
        messagePreview: {
            width: '90%',
        },
        pinIcon: {
            width: '10%',
            alignItems: 'flex-end',
            transform: [{ rotate: '45deg' }],
        },
    })

export default RoomsList
