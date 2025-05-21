const BRIDGE_LOG_SIZE_LIMIT = 5 * 1024 * 1024 // 5MB

const nthLogFile = (n: number) => `bridge.${n}.log`

function getCurrentBridgeLogFileIndex(): number {
    const currentFileIndex = Number(
        localStorage.currentBridgeLogFileIndex || '0',
    )
    if (isNaN(currentFileIndex)) {
        return 0
    }
    if (currentFileIndex > 1) {
        throw new Error('bug: currentFileIndex can only be 0 or 1')
    }
    return currentFileIndex
}

function setCurrentBridgeLogFileIndex(value: number) {
    if (value > 1) {
        throw new Error('bug: currentFileIndex can only be 0 or 1')
    }
    localStorage.currentBridgeLogFileIndex = value
}

export async function openBridgeLogFile(): Promise<FileSystemSyncAccessHandle> {
    const root = await navigator.storage.getDirectory()
    const openNthLogFile = async (n: number) => {
        const fileHandle = await root.getFileHandle(nthLogFile(n), {
            create: true,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await (fileHandle as any).createSyncAccessHandle()
    }

    const currentFileIndex = getCurrentBridgeLogFileIndex()
    const currentFile = await openNthLogFile(currentFileIndex)
    if (currentFile.getSize() > BRIDGE_LOG_SIZE_LIMIT) {
        currentFile.close()
        // roll, cycle between .0 and .1 to make sure we retain at least 5MB at all times
        const newFileIndex = (currentFileIndex + 1) % 2
        setCurrentBridgeLogFileIndex(newFileIndex)
        const newFile = await openNthLogFile(newFileIndex)
        newFile.truncate(0)
        return newFile
    } else {
        return currentFile
    }
}

export async function getAllBridgeLogFiles() {
    const root = await navigator.storage.getDirectory()
    const currentFileIndex = getCurrentBridgeLogFileIndex()
    return [
        await root.getFileHandle(nthLogFile(currentFileIndex % 2)),
        await root.getFileHandle(nthLogFile((currentFileIndex - 1 + 2) % 2)),
    ]
}
