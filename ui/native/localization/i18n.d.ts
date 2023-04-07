import 'i18next'

import { resources } from '@fedi/common/localization'

declare module 'react-i18next' {
    type ResourceType = typeof resources
    interface CustomTypeOptions {
        resources: ResourceType['en']
    }
}
