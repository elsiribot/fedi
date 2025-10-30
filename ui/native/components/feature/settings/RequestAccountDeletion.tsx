import { useNavigation } from '@react-navigation/native'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import { useTranslation } from 'react-i18next'
import { Alert, StyleSheet } from 'react-native'

import { API_ORIGIN } from '@fedi/common/constants/api'
import {
    selectCommunities,
    selectLoadedFederations,
    selectMatrixAuth,
} from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import Flex from '../../ui/Flex'

export const RequestAccountDeletion = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const style = styles(theme)
    const navigation = useNavigation()

    const communities = useAppSelector(selectCommunities)
    const federations = useAppSelector(selectLoadedFederations)
    const matrixAuth = useAppSelector(selectMatrixAuth)

    const handleRequestAccountDeletion = () => {
        // Check if user has more than 1 community (default) or any federations
        if (communities.length > 1 || federations.length > 0) {
            Alert.alert(
                t('feature.settings.request-account-deletion'),
                t('feature.settings.must-leave-federations-first'),
            )
            return
        }

        if (!matrixAuth?.userId) return

        // Navigate to FediModBrowser with the account deletion URL
        navigation.navigate('FediModBrowser', {
            url: `${API_ORIGIN}/account-deletion#id=${encodeURIComponent(matrixAuth.userId)}`,
        })
    }

    return (
        <Flex center style={style.container}>
            <Button
                type="clear"
                onPress={handleRequestAccountDeletion}
                buttonStyle={style.deleteButton}>
                <Text
                    caption
                    medium
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    style={style.deleteButtonText}>
                    {t('feature.settings.request-account-deletion')}
                </Text>
            </Button>
        </Flex>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {},
        deleteButton: {
            padding: 0,
            paddingTop: theme.spacing.sm,
            margin: 0,
        },
        deleteButtonText: {
            color: theme.colors.grey,
        },
    })
