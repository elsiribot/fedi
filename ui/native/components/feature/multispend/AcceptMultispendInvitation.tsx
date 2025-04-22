import { useNavigation } from '@react-navigation/native'
import { Button, Theme, useTheme } from '@rneui/themed'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useMultispendVoting } from '@fedi/common/hooks/multispend'

import { fedimint } from '../../../bridge'
import CustomOverlay from '../../ui/CustomOverlay'

const AcceptMultispendInvitation: React.FC<{
    roomId: string
}> = ({ roomId }) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation()
    const {
        isLoading,
        needsToJoin,
        handleAcceptMultispend,
        joinBeforeAcceptContents,
    } = useMultispendVoting({
        t,
        fedimint,
        roomId,
        onJoinFederation: (invite: string) => {
            navigation.navigate('JoinFederation', {
                invite,
            })
        },
    })

    const style = styles(theme)

    return (
        <View style={style.container}>
            <Button disabled={isLoading} onPress={handleAcceptMultispend}>
                {t('words.accept')}
            </Button>
            {joinBeforeAcceptContents && (
                <CustomOverlay
                    show={needsToJoin}
                    contents={joinBeforeAcceptContents}
                />
            )}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            gap: theme.spacing.md,
            paddingHorizontal: theme.spacing.md,
        },
        recoveryIndicator: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 64,
            width: '100%',
        },
        recoverySpinner: {
            width: 64,
            height: 64,
        },
    })

export default AcceptMultispendInvitation
