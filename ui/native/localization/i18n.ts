import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as RNLocalize from 'react-native-localize'
import { resources } from '@fedi/common/localization'

const supportedLngs = Object.keys(resources)
const bestLanguage = RNLocalize.findBestAvailableLanguage(supportedLngs)

i18n.use(initReactI18next) // passes i18n down to react-i18next
    .init({
        compatibilityJSON: 'v3',
        resources,
        lng: bestLanguage?.languageTag,
        fallbackLng: 'en',
        supportedLngs,
        returnNull: false,

        interpolation: {
            escapeValue: false, // react already safes from xss
        },
    })

export default i18n
