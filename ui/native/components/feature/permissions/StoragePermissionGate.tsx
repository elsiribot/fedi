import React from 'react'
import { useTranslation } from 'react-i18next'
import { RESULTS } from 'react-native-permissions'

import { useStoragePermission } from '../../../utils/hooks'
import { PermissionGate } from './PermissionGate'

interface Props {
    children: React.ReactNode
    alternativeActionButton?: React.ReactNode
}

export const StoragePermissionGate: React.FC<Props> = ({
    children,
    alternativeActionButton,
}) => {
    const { t } = useTranslation()
    const { storagePermission, requestStoragePermission } =
        useStoragePermission()

    if (storagePermission === RESULTS.DENIED) {
        return (
            <PermissionGate
                icon="FediFile"
                title={t('feature.permissions.allow-storage-title')}
                descriptionIcons={['Photo', 'Note', 'Video']}
                descriptionText={t(
                    'feature.permissions.allow-storage-description',
                )}
                onContinue={requestStoragePermission}
                alternativeActionButton={alternativeActionButton}
            />
        )
    }

    return <>{children}</>
}
