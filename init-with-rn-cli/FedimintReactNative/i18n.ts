import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import EN from './locales/en.json'
import ES from './locales/es.json'

export const resources = {
    en: {
        translation: EN,
    },
    es: {
        translation: ES,
    },
}

i18n.use(initReactI18next) // passes i18n down to react-i18next
    .init({
        compatibilityJSON: 'v3',
        resources,
        lng: 'en',

        interpolation: {
            escapeValue: false, // react already safes from xss
        },
    })

export default i18n
