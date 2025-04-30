import { Theme, useTheme } from '@rneui/themed'
import { StyleSheet } from 'react-native'

import { useBackupRecoveryContext } from '../../../state/contexts/BackupRecoveryContext'
import Flex from '../../ui/Flex'
import RecordVideo from './RecordVideo'
import ReviewVideo from './ReviewVideo'

const BackupVideoRecorder = () => {
    const { theme } = useTheme()
    const { state } = useBackupRecoveryContext()
    const { videoFile } = state
    return (
        <Flex grow align="center" style={styles(theme).container}>
            {videoFile ? <ReviewVideo /> : <RecordVideo />}
        </Flex>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            width: '100%',
            paddingHorizontal: theme.spacing.md,
        },
    })

export default BackupVideoRecorder
