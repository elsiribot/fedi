import { resources } from './i18n'
import 'i18next'

declare module 'i18next' {
    interface CustomTypeOptions {
        returnNull: false
    }
}

declare module 'react-i18next' {
    interface CustomTypeOptions {
        resources: typeof resources['en']
    }
}
