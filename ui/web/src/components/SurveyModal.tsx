import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import tooltipIcon from '@fedi/common/assets/svgs/tooltip.svg'
import { SURVEY_URL } from '@fedi/common/constants/support'
import { theme } from '@fedi/common/constants/theme'
import { useNuxStep } from '@fedi/common/hooks/nux'
import { selectLanguage } from '@fedi/common/redux'
import { resetSurveyTimestamp } from '@fedi/common/redux/support'
import { getSurveyLanguage } from '@fedi/common/utils/survey'

import { useAppDispatch, useAppSelector } from '../hooks'
import { styled } from '../styles'
import { Icon } from './Icon'
import { Modal } from './Modal'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const SurveyModal: React.FC<Props> = ({ open, onOpenChange }) => {
    const [, completeAcceptSurvey] = useNuxStep('hasAcceptedSurvey')

    const language = useAppSelector(selectLanguage)
    const dispatch = useAppDispatch()

    const { t } = useTranslation()

    const handleDismiss = useCallback(() => {
        dispatch(resetSurveyTimestamp())
        onOpenChange(false)
    }, [dispatch, onOpenChange])

    const handleOpenSurveyLink = useCallback(() => {
        const surveyUrl = new URL(SURVEY_URL)

        if (language) {
            surveyUrl.searchParams.set('lang', getSurveyLanguage(language))
        }

        handleDismiss()
        completeAcceptSurvey()

        window.open(surveyUrl.toString(), '_blank')
    }, [language, handleDismiss, completeAcceptSurvey])

    return (
        <Modal
            open={open}
            onClick={handleOpenSurveyLink}
            onOpenChange={handleDismiss}
            buttonText={t('feature.support.give-feedback')}
            title={t('feature.support.survey-title')}
            description={t('feature.support.survey-description')}
            showCloseButton>
            <ModalContents>
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
