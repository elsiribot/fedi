import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import commonEN from './en/common.json'
import commonES from './es/common.json'

export const resources = {
    en: {
        translation: commonEN,
    },
    es: {
        translation: commonES,
    },
}

i18n.use(initReactI18next) // passes i18n down to react-i18next
    .init({
        compatibilityJSON: 'v3',
        resources,
        lng: 'en',
        returnNull: false,

        interpolation: {
            escapeValue: false, // react already safes from xss
        },
    })

export default i18n
