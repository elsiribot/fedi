import { useNavigation } from '@react-navigation/native'
import { Text, Button, useTheme } from '@rneui/themed'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import {
    i18nToWeglotLanguageMap,
    SURVEY_URL,
} from '@fedi/common/constants/support'
import { i18nLanguages } from '@fedi/common/localization'
import { selectLanguage } from '@fedi/common/redux'
import {
    dismissSurveyModal,
    shouldShowSurveyModal,
} from '@fedi/common/redux/support'

import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import CenterOverlay from '../../ui/CenterOverlay'
import Flex from '../../ui/Flex'
import HoloCircle from '../../ui/HoloCircle'
import SvgImage from '../../ui/SvgImage'

const SurveyOverlay: React.FC = () => {
    const show = useAppSelector(shouldShowSurveyModal)
    const language = useAppSelector(selectLanguage)
    const dispatch = useAppDispatch()
    const navigation = useNavigation()

    const { t } = useTranslation()
    const { theme } = useTheme()

    const handleDismiss = useCallback(() => {
        dispatch(dismissSurveyModal())
    }, [dispatch])

    const handleOpenSurveyLink = useCallback(() => {
        const surveyUrl = new URL(SURVEY_URL)

        if (language) {
            surveyUrl.searchParams.set(
                'lang',
                i18nToWeglotLanguageMap[
                    language as keyof typeof i18nLanguages
                ] ?? 'en',
            )
        }

        handleDismiss()

        // wait for the modal's close animation + unmount to finish
        // immediately navigating while the modal is actively unmounting causes the screen to be unresponsive
        setTimeout(() => {
            navigation.navigate('FediModBrowser', {
                url: surveyUrl.toString(),
            })
        }, 500)
    }, [language, navigation, handleDismiss])

    return (
        <CenterOverlay
            show={show}
            onBackdropPress={handleDismiss}
            showCloseButton>
            <Flex gap="lg" align="center" fullWidth>
                <HoloCircle
                    size={64}
                    content={<SvgImage name="Tooltip" size={48} />}
                />
                <Text h2 medium center>
                    {t('feature.support.survey-title')}
                </Text>
                <Text center color={theme.colors.darkGrey}>
                    {t('feature.support.survey-description')}
                </Text>
                <Button onPress={handleOpenSurveyLink} fullWidth>
                    {t('feature.support.give-feedback')}
                </Button>
            </Flex>
        </CenterOverlay>
    )
}

export default SurveyOverlay
