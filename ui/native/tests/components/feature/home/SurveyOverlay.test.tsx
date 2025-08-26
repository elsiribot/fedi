import { screen } from '@testing-library/react-native'

import i18n from '@fedi/native/localization/i18n'

import SurveyOverlay from '../../../../components/feature/home/SurveyOverlay'
import { renderWithProviders } from '../../../utils/render'

describe('SurveyModal', () => {
    it('should render with the correct title, description, and button', async () => {
        renderWithProviders(
            <SurveyOverlay
                open
                onOpenChange={() => {}}
                url="https://survey-test.fedi.xyz"
            />,
        )

        const title = screen.getByText(i18n.t('feature.support.survey-title'))
        const description = screen.getByText(
            i18n.t('feature.support.survey-description'),
        )
        const button = screen.getByText(i18n.t('feature.support.give-feedback'))

        expect(title).toBeOnTheScreen()
        expect(description).toBeOnTheScreen()
        expect(button).toBeOnTheScreen()
    })
})
