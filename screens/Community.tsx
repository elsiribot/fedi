import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import React from 'react'
import { useTranslation } from 'react-i18next'
import {
    Dimensions,
    ImageSourcePropType,
    ListRenderItem,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native'
import { Icon, Image, Text, Theme, useTheme } from '@rneui/themed'

import type { HomeTabsParamList } from './Home'
import type { RootStackParamList } from '../Router'
import { Images } from '../assets/images'
import { FlatList } from 'react-native-gesture-handler'
import DateUtils from '../utils/DateUtils'

export type Props = BottomTabScreenProps<
    HomeTabsParamList & RootStackParamList,
    'Community'
>

type Message = {
    id: string
    content: string
    timestamp: number
}

type Conversation = {
    id: string
    icon: ImageSourcePropType
    name: string
    lastMessage: Message
    pinned: boolean
}

const MOCKED_CONVERSATIONS: Conversation[] = [
    {
        id: 'c1',
        icon: Images.FediLogoIcon,
        name: 'Fedi',
        pinned: true,
        lastMessage: {
            id: 'm1',
            timestamp: Date.now() / 1000 - 200000,
            content:
                'Welcome to Fedi! This channel will keep you up to date on events happening within your Fedi app such as:<br><br>- Federation health checks<br>- Scam awareness<br>- Security checks<br>- App updates<br>- Tips & tricks<br>- Education',
        },
    },
    {
        id: 'c2',
        icon: Images.Recovery,
        name: 'Recovery Support',
        pinned: false,
        lastMessage: {
            id: 'm2',
            timestamp: Date.now() / 1000,
            content:
                'Could someone please help me get in touch with a guardian so I can recover my funds??? My phone was stolen it is urgent!',
        },
    },
]

type ConversationTileProps = {
    conversation: Conversation
    selectConversation: (conversation: Conversation) => void
}

const ConversationTile = ({
    conversation,
    selectConversation,
}: ConversationTileProps) => {
    const { theme } = useTheme()

    return (
        <TouchableOpacity
            style={styles(theme).tileContainer}
            onPress={() => selectConversation(conversation)}>
            <View style={styles(theme).tileIconContainer}>
                <Image
                    source={conversation.icon}
                    style={styles(theme).tileIcon}
                />
            </View>
            <View style={styles(theme).tileContents}>
                <View style={styles(theme).topRow}>
                    <Text>{conversation.name}</Text>
                    <Text>
                        {DateUtils.formatConversationTimestamp(
                            conversation.lastMessage.timestamp,
                        )}
                    </Text>
                </View>
                <View style={styles(theme).bottomRow}>
                    <Text
                        style={styles(theme).messagePreview}
                        numberOfLines={2}>
                        {conversation.lastMessage.content}
                    </Text>
                    {conversation.pinned && (
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

const Community: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()

    const renderConversation: ListRenderItem<Conversation> = ({ item }) => {
        return (
            <ConversationTile
                conversation={item}
                selectConversation={(conversation: Conversation) => {
                    console.log('go to conversation detail', conversation.id)
                    // setSelectedConversation(conversation)
                    // navigation.navigate('ConversationMessages')
                }}
            />
        )
    }

    return (
        <View style={styles(theme).container}>
            <FlatList
                data={MOCKED_CONVERSATIONS}
                renderItem={renderConversation}
                keyExtractor={(item: Conversation) => `${item.id}`}
                // optimization that allows skipping the measurement of dynamic content
                // for fixed-size list items
                getItemLayout={(data, index) => ({
                    length: WINDOW_WIDTH,
                    offset: 48 * index,
                    index,
                })}
            />
        </View>
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

export default Community
