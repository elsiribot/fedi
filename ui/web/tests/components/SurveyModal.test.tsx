import { screen } from '@testing-library/react'

import SurveyModal from '../../src/components/SurveyModal'
import i18n from '../../src/localization/i18n'
import { renderWithProviders } from '../../src/utils/test-utils/render'

describe('SurveyModal', () => {
    it('should render with the correct title, description, and button', async () => {
        renderWithProviders(<SurveyModal open onOpenChange={() => {}} />)

        const titles = screen.getAllByText(
            i18n.t('feature.support.survey-title'),
        )
        const descriptions = screen.getAllByText(
            i18n.t('feature.support.survey-description'),
        )
        const button = screen.getByText(i18n.t('feature.support.give-feedback'))

        // expects two titles and two descriptions because the Modal component includes a visually hidden title and description for accessibility
        expect(titles.length).toBe(2)
        expect(descriptions.length).toBe(2)
        expect(button).toBeInTheDocument()
    })
})
