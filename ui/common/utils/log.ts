import { StorageApi } from '../types'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogItem {
    timestamp: number
    level: LogLevel
    context: string
    message: string
    extra?: unknown[]
}

const LOG_STORAGE_KEY = 'fedi:logs'
const MAX_LOGS_STORED = 3000

let storage: StorageApi | undefined
let cachedLogs: LogItem[] = []
let saveTimeout: ReturnType<typeof setTimeout> | undefined

/**
 * Configure the logger with platform and environment specific configuration.
 * Can safely be called multiple times with any changes to configuration.
 */
export function configureLogging(storageArg: StorageApi) {
    storage = storageArg
}

/**
 * Create a logging object. Pass in a context string to be included with all
 * logs to make logs easier to find.
 */
export function makeLog(context: string) {
    return {
        debug: (msg: string, ...extra: unknown[]) =>
            innerLog('debug', context, msg, ...extra),
        info: (msg: string, ...extra: unknown[]) =>
            innerLog('info', context, msg, ...extra),
        warn: (msg: string, ...extra: unknown[]) =>
            innerLog('warn', context, msg, ...extra),
        error: (msg: string, ...extra: unknown[]) =>
            innerLog('error', context, msg, ...extra),
    }
}

/**
 * Export logs as a plain string that can be saved to a file.
 */
export async function exportLogs(): Promise<string> {
    // Combined stored logs with any cached logs that haven't been saved yet.
    const logs = [...(await getLogsFromStorage()), ...cachedLogs]
    return logs.reduce((prev, log) => {
        // Massage the logs to look more like the rust logs, should make combining
        // them a lot easier.
        const { timestamp, level, ...rest } = log
        const jsonString = JSON.stringify({
            timestamp: new Date(timestamp).toISOString(),
            level: level.toUpperCase(),
            ...rest,
        })
        prev += `${jsonString}\n`
        return prev
    }, '')
}

/**
 * Forcibly save logs to storage. Logs are automatically saved to storage
 * periodically, This should only be called when the app is about to close
 * to prevent logs that haven't been stored yet from being lost.
 */
export async function saveLogsToStorage() {
    if (!storage) {
        throw new Error('Logging storage not initialized')
    }
    const oldLogs = await getLogsFromStorage()
    const newLogs = [...oldLogs, ...cachedLogs].slice(-MAX_LOGS_STORED)
    await storage.setItem(LOG_STORAGE_KEY, JSON.stringify(newLogs))
    cachedLogs = []
}

async function getLogsFromStorage(): Promise<LogItem[]> {
    if (!storage) {
        throw new Error('Logging storage not initialized')
    }
    const logs = await storage.getItem(LOG_STORAGE_KEY)
    if (!logs) return []
    try {
        return JSON.parse(logs)
    } catch (err) {
        return []
    }
}

function innerLog(
    level: LogLevel,
    context: string,
    message: string,
    ...extra: unknown[]
) {
    const logItem = {
        timestamp: Date.now(),
        level,
        context,
        message: formatArgForStorage(message) as string,
        extra: extra.length ? extra.map(formatArgForStorage) : undefined,
    }
    cachedLogs.push(logItem)

    // eslint-disable-next-line no-console
    const consoleFn = console[level]
    consoleFn(context ? `[${context}] ${message}` : message, ...extra)

    // Force a save if we have more than 20 logs in the cache. Otherwise save
    // after a brief delay.
    clearTimeout(saveTimeout)
    if (cachedLogs.length >= 20) {
        saveLogsToStorage()
    } else {
        saveTimeout = setTimeout(saveLogsToStorage, 100)
    }
}

function formatArgForStorage(arg: unknown) {
    // Non-objects can stay as-is
    if (typeof arg !== 'object' || arg === null) {
        return arg
    }
    // Attempt to JSON stringify objects, but fall back to toString()
    // if they can't be due to something like circular references.
    try {
        // Special exception for errors, they don't JSON serialize properly
        if (arg instanceof Error) {
            return JSON.stringify(arg, Object.getOwnPropertyNames(arg))
        } else {
            return JSON.stringify(arg)
        }
    } catch (err) {
        return arg.toString()
    }
}
