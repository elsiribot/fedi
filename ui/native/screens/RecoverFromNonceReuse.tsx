import { useNavigation } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { joinFederation } from '@fedi/common/redux'

import { fedimint } from '../bridge'
import { SafeAreaContainer } from '../components/ui/SafeArea'
import SvgImage from '../components/ui/SvgImage'
import { useAppDispatch } from '../state/hooks'
import { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'RecoverFromNonceReuse'
>

const RecoverFromNonceReuse: React.FC<Props> = ({ route }) => {
    const { federationInvites } = route.params
    const { theme } = useTheme()
    const { t } = useTranslation()
    const style = styles(theme)
    const dispatch = useAppDispatch()
    const navigation = useNavigation()

    const handleRecoverFromNonceReuse = () => {
        for (const invite of federationInvites) {
            dispatch(
                joinFederation({
                    fedimint,
                    code: invite,
                    recoverFromScratch: true,
                }),
            )
        }

        navigation.navigate('TabsNavigator')
    }

    return (
        <SafeAreaContainer edges="notop">
            <View style={style.content}>
                <SvgImage name="ContinueRecovery" size={64} />
                <Text h2>{t('feature.recovery.continue-recovery')}</Text>
                <Text>
                    {t('feature.recovery.continue-recovery-description')}
                </Text>
            </View>
            <Button onPress={handleRecoverFromNonceReuse}>
                {t('words.continue')}
            </Button>
        </SafeAreaContainer>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        content: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: theme.spacing.md,
        },
    })

export default RecoverFromNonceReuse
