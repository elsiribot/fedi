import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { resources } from '@fedi/common/localization'

i18n.use(initReactI18next).init({
    fallbackLng: 'en',
    resources,
    returnNull: false,

    interpolation: {
        escapeValue: false, // not needed for react as it escapes by default
    },
})

/**
 * Attempt to detect the user's language, and then configure i18n to use that.
 * Shoudl be called after initial render to avoid SSR rehydrate mismatch.
 */
export async function detectLanguage() {
    const language = localStorage.getItem('language')
    if (language && language in resources) {
        i18n.changeLanguage(language)
    } else {
        // If they didn't have something in LS, detect & set.
        import('i18next-browser-languagedetector').then(
            ({ default: LanguageDetector }) => {
                console.log(LanguageDetector)
                const detector = new LanguageDetector(i18n.services)
                const detected = detector.detect()

                let desiredLanguage = 'en'
                if (detected) {
                    const lngs = Array.isArray(detected) ? detected : [detected]
                    for (const lng of lngs) {
                        if (lng in resources) {
                            desiredLanguage = lng
                            break
                        }
                    }
                }
                localStorage.setItem('language', desiredLanguage)
                i18n.changeLanguage(desiredLanguage)
            },
        )
    }
}

export default i18n
