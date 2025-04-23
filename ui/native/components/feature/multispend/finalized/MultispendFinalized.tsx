import { useNavigation } from '@react-navigation/native'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { selectMatrixRoomMultispendStatus } from '@fedi/common/redux'

import { useAppSelector } from '../../../../state/hooks'
import { SafeAreaContainer } from '../../../ui/SafeArea'
import SvgImage from '../../../ui/SvgImage'

const MultispendFinalized: React.FC<{
    roomId: string
}> = ({ roomId }) => {
    const multispendStatus = useAppSelector(s =>
        selectMatrixRoomMultispendStatus(s, roomId),
    )

    if (!multispendStatus)
        throw new Error(
            'MultispendFinalized should not be shown unless multispend status is finalized',
        )

    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation()

    const style = styles(theme)

    return (
        <View style={style.container}>
            <View style={style.header}>
                <Text medium>
                    {t('feature.multispend.withdrawal-requests')}
                </Text>
            </View>
            <View style={style.emptyState}>
                <SvgImage
                    color={theme.colors.grey}
                    size={52}
                    name="MultispendGroup"
                />
                <Text medium style={style.emptyTitle}>
                    {t('feature.multispend.no-pending-requests')}
                </Text>
                <Text small style={style.emptyDescription}>
                    {t('feature.multispend.no-requests-notice')}
                </Text>
            </View>
            <SafeAreaContainer edges="notop" style={style.buttons}>
                <Button
                    containerStyle={style.button}
                    outline
                    onPress={() =>
                        navigation.navigate('MultispendDeposit', { roomId })
                    }>
                    {t('words.deposit')}
                </Button>
                <Button
                    containerStyle={style.button}
                    onPress={() =>
                        navigation.navigate('MultispendWithdraw', { roomId })
                    }>
                    {t('words.withdraw')}
                </Button>
            </SafeAreaContainer>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            flexDirection: 'column',
            gap: theme.spacing.md,
        },
        header: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: theme.spacing.md,
        },
        emptyState: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            flex: 1,
        },
        emptyTitle: {
            textAlign: 'center',
            fontSize: 20,
            color: theme.colors.grey,
        },
        emptyDescription: {
            textAlign: 'center',
            color: theme.colors.grey,
        },
        buttons: {
            backgroundColor: theme.colors.white,
            flex: 0,
            flexDirection: 'row',
            gap: theme.spacing.md,
            paddingTop: theme.spacing.md,
            shadowColor: 'rgba(11, 16, 19, 0.1)',
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowRadius: 12,
            elevation: 12,
            shadowOpacity: 1,
            borderTopWidth: 1,
            borderColor: theme.colors.extraLightGrey,
        },
        button: {
            flex: 1,
        },
    })

export default MultispendFinalized
