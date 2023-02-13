import 'i18next'
import { resources } from './i18n'

declare module 'react-i18next' {
    type ResourceType = typeof resources
    interface CustomTypeOptions {
        resources: ResourceType['en']
    }
}
