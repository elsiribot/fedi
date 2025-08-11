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

import { useAppDispatch, useAppSelector } from '../hooks'
import { Button } from './Button'
import { Dialog } from './Dialog'

const SurveyModal: React.FC = () => {
    const show = useAppSelector(shouldShowSurveyModal)
    const language = useAppSelector(selectLanguage)
    const dispatch = useAppDispatch()

    const { t } = useTranslation()

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
        window.open(surveyUrl.toString(), '_blank')
    }, [language, handleDismiss])

    return (
        <Dialog
            open={show}
            onOpenChange={handleDismiss}
            title={t('feature.support.survey-title')}
            description={t('feature.support.survey-description')}>
            <Button onClick={handleOpenSurveyLink}>
                {t('feature.support.give-feedback')}
            </Button>
        </Dialog>
    )
}

export default SurveyModal
