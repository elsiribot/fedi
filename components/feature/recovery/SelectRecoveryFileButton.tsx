import { useNavigation } from '@react-navigation/native'
import { Button } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import DocumentPicker, {
    DocumentPickerResponse,
    types,
} from 'react-native-document-picker'

import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useBridge } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'

const SelectRecoveryFileButton: React.FC<{}> = () => {
    const { t } = useTranslation()
    const { validateBackupFile } = useBridge()
    const { toast } = useEnvironmentContext().state
    const navigation = useNavigation<NavigationHook>()
    const [result, setResult] = useState<
        DocumentPickerResponse | undefined | null
    >()

    const openFileExplorer = async () => {
        try {
            const response = await DocumentPicker.pickSingle({
                type: types.allFiles,
            })
            console.info(response)

            setResult(response)
        } catch (error) {
            const typedError = error as Error
            console.error('DocumentPicker Error: ', typedError)
            toast?.show(typedError?.message, 3000)
        }
    }

    useEffect(() => {
        const checkForValidFile = async () => {
            try {
                await validateBackupFile(result!.uri)
                navigation.replace('SelectRecoveryFileSuccess', {
                    fileName: result!.name as string,
                })
            } catch (error) {
                navigation.replace('SelectRecoveryFileFailure', {
                    fileName: result!.name as string,
                })
            }
        }

        if (result?.uri && result?.name) {
            checkForValidFile()
        }
    }, [navigation, result, validateBackupFile])

    return (
        <Button
            title={t('feature.recovery.search-files')}
            containerStyle={styles.searchButton}
            onPress={openFileExplorer}
        />
    )
}

const styles = StyleSheet.create({
    searchButton: {
        width: '100%',
        marginTop: 'auto',
    },
})

export default SelectRecoveryFileButton
