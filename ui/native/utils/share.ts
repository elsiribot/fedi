import RNFS from 'react-native-fs'
import Share from 'react-native-share'

import { exportLogs } from '@fedi/common/utils/log'
import { makeTarGz } from '@fedi/common/utils/targz'

export async function shareLogs() {
    const jsLogs = await exportLogs()
    const bridgeLogs = await RNFS.read(`${RNFS.DocumentDirectoryPath}/fedi.log`)
    const targz = await makeTarGz([
        { name: 'app.log', content: jsLogs },
        { name: 'bridge.log', content: bridgeLogs },
    ])
    const filename = `fedi-logs-${Math.floor(Date.now() / 1000)}.tar.gz`
    return Share.open({
        title: 'Fedi logs',
        url: `data:application/tar+gzip;base64,${targz.toString('base64')}`,
        filename: filename,
        type: 'application/tar+gzip',
    })
}
