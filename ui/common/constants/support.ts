import { i18nLanguages } from '../localization'

export const SURVEY_URL = 'https://survey-test.fedi.xyz/interrogation'

export const i18nToWeglotLanguageMap: Partial<
    Record<keyof typeof i18nLanguages, string>
> = {
    en: 'en',
    es: 'es',
    pt: 'pt',
    ar: 'ar',
    // TODO: add more languages
}
