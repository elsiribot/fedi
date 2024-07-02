import { Text, Theme, useTheme } from '@rneui/themed'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import {
    selectActiveFederation,
    selectActiveFederationChats,
} from '@fedi/common/redux'
import { getFederationGroupChats } from '@fedi/common/utils/FederationUtils'

import { useAppSelector } from '../../../state/hooks'
import { MatrixRoom } from '../../../types'
import CommunityChatTile from './CommunityChatTile'

const CommunityChats = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const style = styles(theme)
    const activeFederation = useAppSelector(selectActiveFederation)
    const defaultChats = useAppSelector(s => selectActiveFederationChats(s))
    if (!activeFederation) return null
    const expectedNumberOfDefaultChats = getFederationGroupChats(
        activeFederation.meta,
    ).length

    // If we have fewer default chats than expected,
    // Assume we're loading and fill the gaps with undefined
    const chats =
        defaultChats.length === expectedNumberOfDefaultChats
            ? defaultChats
            : new Array(expectedNumberOfDefaultChats).fill(undefined)

    return (
        <View style={style.container}>
            <Text medium style={style.sectionTitle}>
                {t('feature.chat.community-chat')}
            </Text>
            {chats.map((chat: MatrixRoom | undefined, idx) => (
                <CommunityChatTile key={idx} room={chat} />
            ))}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: { gap: theme.spacing.sm, width: '100%' },
        sectionTitle: {
            color: theme.colors.primaryLight,
            letterSpacing: -0.16,
        },
    })

export default CommunityChats
