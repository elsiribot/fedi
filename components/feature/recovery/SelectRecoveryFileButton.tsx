import { useNavigation } from '@react-navigation/native'
import { Button } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import DocumentPicker, {
    DocumentPickerResponse,
    types,
} from 'react-native-document-picker'
import RNFS from 'react-native-fs'

import { useBridge } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'

const SelectRecoveryFileButton: React.FC<{}> = () => {
    const { t } = useTranslation()
    const { validateRecoveryFile } = useBridge()
    const navigation = useNavigation<NavigationHook>()
    const [validationInProgress, setValidationInProgress] =
        useState<boolean>(false)
    const [result, setResult] = useState<
        DocumentPickerResponse | undefined | null
    >()

    const openFileExplorer = async () => {
        try {
            const response = await DocumentPicker.pickSingle({
                type: types.allFiles,
            })
            console.info(response)

            setValidationInProgress(true)
            setResult(response)
        } catch (error) {
            const typedError = error as Error
            console.error('DocumentPicker Error: ', typedError)
            // Hiding this because it shows the toast when user closes the dialogue ...
            // toast?.show(typedError?.message, 3000)
        }
    }

    useEffect(() => {
        const checkForValidFile = async () => {
            // copy file to docs directory so rust can read it
            const dest = `${RNFS.DocumentDirectoryPath}/backup.fedi`
            // remove existing file
            try {
                await RNFS.unlink(dest)
            } catch (e) {
                console.log('no existing file to remove')
            }
            // copy file to docs dir
            await RNFS.copyFile(result!.uri, dest)
            // validate file
            try {
                const valid = await validateRecoveryFile(dest)
                if (valid) {
                    navigation.replace('SelectRecoveryFileSuccess', {
                        fileName: dest,
                    })
                } else {
                    navigation.replace('SelectRecoveryFileFailure', {
                        fileName: dest,
                    })
                }
            } catch (error) {
                navigation.replace('SelectRecoveryFileFailure', {
                    fileName: dest,
                })
            }
            setValidationInProgress(false)
        }

        if (validationInProgress && result?.uri && result?.name) {
            setTimeout(() => {
                checkForValidFile()
            })
        }
    }, [navigation, result, validateRecoveryFile, validationInProgress])

    return (
        <Button
            title={t('feature.recovery.search-files')}
            containerStyle={styles.searchButton}
            onPress={openFileExplorer}
            loading={validationInProgress}
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
