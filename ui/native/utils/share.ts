import RNFS from 'react-native-fs'
import Share from 'react-native-share'

import { exportLogs } from '@fedi/common/utils/log'
import { makeTarGz } from '@fedi/common/utils/targz'

import { getAllDeviceInfo } from './device-info'

export async function shareLogs() {
    // Parallelize all information gathering.
    const [jsLogs, bridgeLogs, infoJson] = await Promise.all([
        exportLogs(),
        RNFS.read(`${RNFS.DocumentDirectoryPath}/fedi.log`),
        getAllDeviceInfo(),
    ])

    const targz = await makeTarGz([
        { name: 'app.log', content: jsLogs },
        { name: 'bridge.log', content: bridgeLogs },
        { name: 'info.json', content: JSON.stringify(infoJson, null, 2) },
    ])
    const filename = `fedi-logs-${Math.floor(Date.now() / 1000)}.tar.gz`
    return Share.open({
        title: 'Fedi logs',
        url: `data:application/tar+gzip;base64,${targz.toString('base64')}`,
        filename: filename,
        type: 'application/tar+gzip',
    })
}
