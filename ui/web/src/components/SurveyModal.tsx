import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import closeIcon from '@fedi/common/assets/svgs/close.svg'
import tooltipIcon from '@fedi/common/assets/svgs/tooltip.svg'
import {
    i18nToWeglotLanguageMap,
    SURVEY_URL,
} from '@fedi/common/constants/support'
import { theme } from '@fedi/common/constants/theme'
import { i18nLanguages } from '@fedi/common/localization'
import { selectLanguage } from '@fedi/common/redux'
import {
    dismissSurveyModal,
    setHasSurveyedUser,
    shouldShowSurveyModal,
} from '@fedi/common/redux/support'

import { useAppDispatch, useAppSelector } from '../hooks'
import { styled } from '../styles'
import { Icon } from './Icon'
import { Modal } from './Modal'

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
        dispatch(setHasSurveyedUser(true))

        window.open(surveyUrl.toString(), '_blank')
    }, [language, handleDismiss, dispatch])

    return (
        <Modal
            open={show}
            onClick={handleOpenSurveyLink}
            onOpenChange={handleDismiss}
            buttonText={t('feature.support.give-feedback')}
            title={t('feature.support.survey-title')}
            description={t('feature.support.survey-description')}>
            <ModalContents>
                <Close onClick={handleDismiss}>
                    <Icon icon={closeIcon} size={20} />
                </Close>
                <IconWrapper>
                    <Icon icon={tooltipIcon} size="md" />
                </IconWrapper>
                <h2>{t('feature.support.survey-title')}</h2>
                <Description>
                    {t('feature.support.survey-description')}
                </Description>
            </ModalContents>
        </Modal>
    )
}

const Close = styled('button', {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
})

const ModalContents = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    position: 'relative',
})

const Description = styled('p', {
    textAlign: 'center',
    color: theme.colors.darkGrey,
})

const IconWrapper = styled('div', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    width: 48,
    height: 48,
    holoGradient: '600',
})

export default SurveyModal
