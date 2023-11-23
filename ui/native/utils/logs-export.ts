import RNFS from 'react-native-fs'
import { Asset } from 'react-native-image-picker'
import Share from 'react-native-share'

import { exportLogs } from '@fedi/common/utils/log'
import { File, makeTarGz } from '@fedi/common/utils/targz'

import { getAllDeviceInfo } from './device-info'

export async function generateLogsExportGzip(extraFiles: File[] = []) {
    // Only read up to 2mb of logs to optimize upload size & performance.
    const LOG_FILE_PATH = `${RNFS.DocumentDirectoryPath}/fedi.log`
    const logSize = (await RNFS.stat(LOG_FILE_PATH)).size
    const logLength = Math.min(logSize, 0.1 * 1024 * 1024)
    const logPosition = Math.max(logSize - logLength, 0)

    // Parallelize all information gathering.
    const [jsLogs, rawBridgeLogs, infoJson] = await Promise.all([
        exportLogs(),
        RNFS.read(LOG_FILE_PATH, logLength, logPosition),
        getAllDeviceInfo(),
    ])

    // If the bridge logs have a fragmented first line, remove it.
    let bridgeLogs = rawBridgeLogs
    if (bridgeLogs.length && bridgeLogs[0] !== '{') {
        bridgeLogs = bridgeLogs.slice(bridgeLogs.indexOf('{'))
    }

    return await makeTarGz([
        { name: 'app.log', content: jsLogs },
        { name: 'bridge.log', content: bridgeLogs },
        { name: 'info.json', content: JSON.stringify(infoJson, null, 2) },
        ...extraFiles,
    ])
}

export async function shareLogsExport() {
    const targz = await generateLogsExportGzip()
    const filename = `fedi-logs-${Math.floor(Date.now() / 1000)}.tar.gz`
    return Share.open({
        title: 'Fedi logs',
        url: `data:application/tar+gzip;base64,${targz.toString('base64')}`,
        filename: filename,
        type: 'application/tar+gzip',
    })
}

export async function attachmentsToFiles(
    attachments: Asset[],
): Promise<File[]> {
    return Promise.all(
        attachments.map(async (a, index) => {
            const fileExt = a.fileName ? `.${a.fileName.split('.').pop()}` : ''
            return {
                name: `attachment-${index}${fileExt}`,
                // TODO: More efficient way of getting buffer than base64 encode / decode,
                // This is really slow.
                content: Buffer.from(
                    await RNFS.readFile(a.uri || '', 'base64'),
                    'base64',
                ),
            }
        }),
    )
}
