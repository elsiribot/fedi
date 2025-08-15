import { MMKV } from 'react-native-mmkv'

import { makeLog } from '@fedi/common/utils/log'

const METADATA_PREFIX = 'fedimod_metadata_'
const TIMESTAMP_SUFFIX = '_timestamp'
const CACHE_SIZE_OVERHEAD_BYTES = 50
const LRU_CLEANUP_PERCENTAGE = 0.8

const log = makeLog('MMKVCacheManager')

export const metadataStorage = new MMKV({
    id: 'fedimod-metadata-cache',
})

export class MMKVCacheManager {
    private static instance: MMKVCacheManager

    private readonly MAX_CACHE_ENTRIES = 500
    private readonly MAX_CACHE_SIZE_MB = 50

    private constructor() {}

    public static getInstance(): MMKVCacheManager {
        if (!MMKVCacheManager.instance) {
            MMKVCacheManager.instance = new MMKVCacheManager()
        }
        return MMKVCacheManager.instance
    }

    public cleanupIfNeeded(): void {
        try {
            const allKeys = metadataStorage.getAllKeys()
            const metadataKeys = allKeys.filter(
                key =>
                    key.startsWith(METADATA_PREFIX) &&
                    !key.endsWith(TIMESTAMP_SUFFIX),
            )

            log.info(
                `Cache check: ${metadataKeys.length} metadata entries (max: ${this.MAX_CACHE_ENTRIES})`,
            )

            if (metadataKeys.length > this.MAX_CACHE_ENTRIES) {
                this.cleanupLRUEntries(
                    this.MAX_CACHE_ENTRIES * LRU_CLEANUP_PERCENTAGE,
                )
            } else {
                log.info('Cache size within limits, no cleanup needed')
            }
        } catch (error) {
            log.error('Error checking cache size:', error)
        }
    }

    private cleanupLRUEntries(targetCount: number): void {
        try {
            const allKeys = metadataStorage.getAllKeys()
            const metadataKeys = allKeys.filter(
                key =>
                    key.startsWith(METADATA_PREFIX) &&
                    !key.endsWith(TIMESTAMP_SUFFIX),
            )

            const entriesWithTimestamp: Array<{
                key: string
                timestamp: number
            }> = []

            metadataKeys.forEach(key => {
                const timestampKey = `${key}${TIMESTAMP_SUFFIX}`
                const timestamp = metadataStorage.getNumber(timestampKey) || 0
                entriesWithTimestamp.push({ key, timestamp })
            })

            entriesWithTimestamp.sort((a, b) => a.timestamp - b.timestamp)

            const toDelete =
                entriesWithTimestamp.length - Math.floor(targetCount)

            if (toDelete > 0) {
                const entriesToDelete = entriesWithTimestamp.slice(0, toDelete)

                entriesToDelete.forEach(({ key }) => {
                    metadataStorage.delete(key)
                    metadataStorage.delete(`${key}${TIMESTAMP_SUFFIX}`)
                })

                log.info(
                    `LRU cleanup: Removed ${toDelete} old metadata entries`,
                )
                log.info(
                    `Cache reduced from ${entriesWithTimestamp.length} to ${entriesWithTimestamp.length - toDelete} entries`,
                )
            }
        } catch (error) {
            log.error('Error during LRU cleanup:', error)
        }
    }

    public clearAllMetadata(): void {
        try {
            const allKeys = metadataStorage.getAllKeys()
            const metadataKeys = allKeys.filter(key =>
                key.startsWith(METADATA_PREFIX),
            )

            metadataKeys.forEach(key => {
                metadataStorage.delete(key)
                metadataStorage.delete(`${key}${TIMESTAMP_SUFFIX}`)
            })

            log.info(
                `Cleared ${metadataKeys.length} metadata entries from MMKV`,
            )
        } catch (error) {
            log.error('Error clearing MMKV metadata cache:', error)
        }
    }

    public clearShortcutMetadata(shortcutId: string): void {
        try {
            const allKeys = metadataStorage.getAllKeys()
            const shortcutKeys = allKeys.filter(key =>
                key.startsWith(`${METADATA_PREFIX}${shortcutId}_`),
            )

            shortcutKeys.forEach(key => {
                metadataStorage.delete(key)
                metadataStorage.delete(`${key}${TIMESTAMP_SUFFIX}`)
            })

            log.info(
                `Cleared ${shortcutKeys.length} entries for shortcut: ${shortcutId}`,
            )
        } catch (error) {
            log.error(`Error clearing metadata for ${shortcutId}:`, error)
        }
    }

    public logCacheStats(): void {
        try {
            const allKeys = metadataStorage.getAllKeys()
            const metadataKeys = allKeys.filter(key =>
                key.startsWith(METADATA_PREFIX),
            )
            const totalKeys = allKeys.length

            let estimatedSizeBytes = 0
            metadataKeys.forEach(key => {
                const value = metadataStorage.getString(key)
                if (value) {
                    estimatedSizeBytes +=
                        key.length + value.length + CACHE_SIZE_OVERHEAD_BYTES
                }
            })

            const estimatedSizeMB = (
                estimatedSizeBytes /
                (1024 * 1024)
            ).toFixed(2)

            log.info('MMKV Cache Stats:')
            log.info(`Total keys: ${totalKeys}`)
            log.info(
                `Metadata keys: ${metadataKeys.length}/${this.MAX_CACHE_ENTRIES}`,
            )
            log.info(
                `Estimated size: ${estimatedSizeMB}MB (max: ${this.MAX_CACHE_SIZE_MB}MB)`,
            )
            log.info(
                `Cache efficiency: ${metadataKeys.length}/${totalKeys} metadata entries`,
            )
        } catch (error) {
            log.error('Error getting cache stats:', error)
        }
    }

    public forceCleanupToSize(targetEntries: number): void {
        log.warn(`Force cleanup to ${targetEntries} entries`)
        this.cleanupLRUEntries(targetEntries)
    }
}

export const getMetadataCacheKey = (shortcutId: string, url: string) => {
    return `${METADATA_PREFIX}${shortcutId}_${url}`
}

export const cacheMetadataWithTimestamp = (
    cacheKey: string,
    iconUri: string,
): void => {
    try {
        metadataStorage.set(cacheKey, iconUri)
        metadataStorage.set(`${cacheKey}${TIMESTAMP_SUFFIX}`, Date.now())
        log.info(`[MMKV] Cached metadata with timestamp: ${cacheKey}`)
    } catch (error) {
        log.error(`[MMKV] Failed to cache metadata: ${cacheKey}`, error)
    }
}

export const getCachedMetadata = (cacheKey: string): string | undefined => {
    try {
        return metadataStorage.getString(cacheKey)
    } catch (error) {
        log.error(`[MMKV] Failed to get cached metadata: ${cacheKey}`, error)
        return undefined
    }
}

export const debugMMKVCache = () => {
    log.info('[MMKV DEBUG] All keys in cache:')
    const allKeys = metadataStorage.getAllKeys()
    allKeys.forEach(key => {
        const value = metadataStorage.getString(key)
        log.info(`  ${key}: ${value?.substring(0, 50)}...`)
    })
}
