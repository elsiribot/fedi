import RNFS from 'react-native-fs'
import { Asset } from 'react-native-image-picker'
import Share from 'react-native-share'
import RNFB from 'rn-fetch-blob'

import { exportLogs as exportAppLogs } from '@fedi/common/utils/log'
import { File, makeTarGz } from '@fedi/common/utils/targz'

import { getAllDeviceInfo } from './device-info'

const MAX_BRIDGE_LOG_SIZE = 1024 * 1024 * 2

export async function generateLogsExportGzip(extraFiles: File[] = []) {
    // Parallelize all information gathering.
    const [jsLogs, bridgeLogs, infoJson] = await Promise.all([
        exportAppLogs(),
        exportBridgeLogs(),
        getAllDeviceInfo(),
    ])

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

async function exportBridgeLogs() {
    // Ensure we get as many logs as limited. Logs are split across multiple files
    // on a rolling basis, so it's possible that `fedi.log` is nearly empty but
    // `fedi.log.1` has a lot of logs from before.
    const LOGS_DIR = RNFB.fs.dirs.DocumentDir
    let files = ['fedi.log']
    const secondLogExists = await RNFB.fs.exists(`${LOGS_DIR}/fedi.log.1`)
    if (secondLogExists) {
        const logStat = await RNFB.fs.stat(`${LOGS_DIR}/fedi.log`)
        if (logStat.size < MAX_BRIDGE_LOG_SIZE) {
            files = ['fedi.log.1', 'fedi.log']
        }
    }

    // Iterate over files and append to string. Starting oldest first, append
    // in ascending order.
    let bridgeLogs = ''
    await new Promise<void>(async resolve => {
        for (const file of files) {
            await new Promise<void>(async innerResolve => {
                const fileStream = await RNFB.fs.readStream(
                    `${LOGS_DIR}/${file}`,
                    'utf8',
                    102400, // 100kb at a time
                )
                fileStream.onData(chunk => {
                    bridgeLogs += chunk
                })
                fileStream.onError(err => {
                    bridgeLogs += JSON.stringify({
                        error: `Error reading file stream for ${file}: ${
                            err.message || err.toString()
                        }`,
                    })
                    innerResolve()
                })
                fileStream.onEnd(() => {
                    innerResolve()
                })
                fileStream.open()
            })
        }
        resolve()
    })

    // Trim logs to 2mb reduce upload size / increase gzip performance. RNFB
    // doesn't allow us to seek before streaming, but it's so much faster than
    // RNFS with seeking that we still save time overall by doing this in JS.
    bridgeLogs = bridgeLogs.slice(-MAX_BRIDGE_LOG_SIZE)

    // Take the first line from the logs and try to JSON parse it. If it fails,
    // cut off the first line since it's fragmented from the slice above. Only
    // split on the first newline, don't split the whole string.
    const newlineIndex = bridgeLogs.indexOf('\n')
    try {
        const firstLine = bridgeLogs.substring(0, newlineIndex)
        JSON.parse(firstLine)
    } catch (err) {
        // Remove first line
        if (newlineIndex !== -1) {
            bridgeLogs = bridgeLogs.slice(newlineIndex + 1)
        }
    }

    return bridgeLogs
}
