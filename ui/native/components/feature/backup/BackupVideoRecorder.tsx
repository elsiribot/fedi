import { useTheme } from '@rneui/themed'

import { useBackupRecoveryContext } from '../../../state/contexts/BackupRecoveryContext'
import Flex from '../../ui/Flex'
import RecordVideo from './RecordVideo'
import ReviewVideo from './ReviewVideo'

const BackupVideoRecorder = () => {
    const { theme } = useTheme()
    const { state } = useBackupRecoveryContext()
    const { videoFile } = state
    return (
        <Flex
            grow
            align="center"
            fullWidth
            style={{ paddingHorizontal: theme.spacing.md }}>
            {videoFile ? <ReviewVideo /> : <RecordVideo />}
        </Flex>
    )
}

export default BackupVideoRecorder
