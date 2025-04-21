import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'

import { selectMatrixRoomMultispendStatus } from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import HoloGradient from '../../ui/HoloGradient'
import SvgImage from '../../ui/SvgImage'

type Props = {
    roomId: string
}

const MultispendChatHeader: React.FC<Props> = ({ roomId }) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation()
    const multispendStatus = useAppSelector(s =>
        selectMatrixRoomMultispendStatus(s, roomId),
    )

    const style = styles(theme)

    if (multispendStatus?.status !== 'activeInvitation') return null

    return (
        <Pressable
            onPress={() => navigation.navigate('GroupMultispend', { roomId })}>
            <HoloGradient
                style={style.container}
                gradientStyle={style.contentContainer}
                level="m500">
                <View style={style.content}>
                    <View style={style.header}>
                        <SvgImage name="MultispendGroup" size={16} />
                        <Text caption bold>
                            {t('words.multispend')}
                        </Text>
                    </View>
                    {multispendStatus.status === 'activeInvitation' && (
                        <View style={style.statusBadge}>
                            <Text small bold>
                                {t('feature.multispend.waiting-for-approval')}
                            </Text>
                        </View>
                    )}
                </View>
                <SvgImage name="ChevronRight" color={theme.colors.grey} />
            </HoloGradient>
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            display: 'flex',
        },
        contentContainer: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: theme.spacing.lg,
        },
        content: {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xs,
        },
        header: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
        },
        statusBadge: {
            borderRadius: 4,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xxs,
            color: theme.colors.primary,
            backgroundColor: theme.colors.orange100,
        },
    })

export default MultispendChatHeader
