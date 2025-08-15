import {
    MMKVCacheManager,
    metadataStorage,
    getMetadataCacheKey,
    cacheMetadataWithTimestamp,
    getCachedMetadata,
} from '../../utils/cache'

jest.mock('react-native-mmkv', () => {
    const mockStorage = new Map()
    return {
        MMKV: jest.fn().mockImplementation(() => ({
            getAllKeys: jest.fn(() => Array.from(mockStorage.keys())),
            getString: jest.fn((key: string) => mockStorage.get(key)),
            getNumber: jest.fn((key: string) => {
                const value = mockStorage.get(key)
                return typeof value === 'number' ? value : undefined
            }),
            set: jest.fn((key: string, value: any) => {
                mockStorage.set(key, value)
            }),
            delete: jest.fn((key: string) => {
                mockStorage.delete(key)
            }),
        })),
    }
})

jest.mock('react-native-turbo-image', () => ({
    clearMemoryCache: jest.fn(),
    clearDiskCache: jest.fn(),
}))

jest.mock('@fedi/common/utils/log', () => ({
    makeLog: () => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    }),
}))

let mockStorage: Map<string, any>

const setupMockStorage = () => {
    mockStorage = new Map()
    const mockMMKV = metadataStorage as any
    mockMMKV.getAllKeys.mockImplementation(() => Array.from(mockStorage.keys()))
    mockMMKV.getString.mockImplementation((key: string) => mockStorage.get(key))
    mockMMKV.getNumber.mockImplementation((key: string) => {
        const value = mockStorage.get(key)
        return typeof value === 'number' ? value : undefined
    })
    mockMMKV.set.mockImplementation((key: string, value: any) => {
        mockStorage.set(key, value)
    })
    mockMMKV.delete.mockImplementation((key: string) => {
        mockStorage.delete(key)
    })
}

describe('MMKVCacheManager', () => {
    let cacheManager: MMKVCacheManager

    beforeEach(() => {
        ;(MMKVCacheManager as any).instance = undefined
        setupMockStorage()
        cacheManager = MMKVCacheManager.getInstance()
    })

    describe('Core Cache Behavior', () => {
        it('LRU cleanup removes oldest entries and keeps newest', () => {
            const baseTime = 1000000
            const entries = [
                { key: 'fedimod_metadata_old', timestamp: baseTime },
                { key: 'fedimod_metadata_middle', timestamp: baseTime + 1000 },
                { key: 'fedimod_metadata_new', timestamp: baseTime + 2000 },
            ]

            entries.forEach(entry => {
                mockStorage.set(entry.key, 'some_value')
                mockStorage.set(`${entry.key}_timestamp`, entry.timestamp)
            })

            expect(mockStorage.size).toBe(6)

            cacheManager.forceCleanupToSize(1)

            expect(mockStorage.has('fedimod_metadata_new')).toBe(true)
            expect(mockStorage.has('fedimod_metadata_middle')).toBe(false)
            expect(mockStorage.has('fedimod_metadata_old')).toBe(false)

            const hasNewTimestamp = mockStorage.has(
                'fedimod_metadata_new_timestamp',
            )

            if (!hasNewTimestamp) {
                expect(mockStorage.size).toBe(1)
            } else {
                expect(mockStorage.has('fedimod_metadata_new_timestamp')).toBe(
                    true,
                )
                expect(
                    mockStorage.has('fedimod_metadata_middle_timestamp'),
                ).toBe(false)
                expect(mockStorage.has('fedimod_metadata_old_timestamp')).toBe(
                    false,
                )
                expect(mockStorage.size).toBe(2)
            }
        })

        it('no cleanup when under 500 entries', () => {
            for (let i = 0; i < 400; i++) {
                mockStorage.set(`fedimod_metadata_test_${i}`, 'value')
                mockStorage.set(
                    `fedimod_metadata_test_${i}_timestamp`,
                    Date.now(),
                )
            }

            expect(mockStorage.size).toBe(800)

            const entriesBeforeCleanup = mockStorage.size
            cacheManager.cleanupIfNeeded()
            const entriesAfterCleanup = mockStorage.size

            expect(entriesAfterCleanup).toBe(entriesBeforeCleanup)
            expect(entriesAfterCleanup).toBe(800)
        })

        it('no cleanup at exactly 500 entries', () => {
            for (let i = 0; i < 500; i++) {
                mockStorage.set(`fedimod_metadata_test_${i}`, 'value')
                mockStorage.set(
                    `fedimod_metadata_test_${i}_timestamp`,
                    Date.now(),
                )
            }

            expect(mockStorage.size).toBe(1000)

            const entriesBeforeCleanup = mockStorage.size
            cacheManager.cleanupIfNeeded()
            const entriesAfterCleanup = mockStorage.size

            expect(entriesAfterCleanup).toBe(entriesBeforeCleanup)
            expect(entriesAfterCleanup).toBe(1000)
        })

        it('cleanup triggers at 501+ entries and reduces to 80%', () => {
            const now = Date.now()

            for (let i = 0; i < 550; i++) {
                mockStorage.set(`fedimod_metadata_test_${i}`, 'value')
                mockStorage.set(`fedimod_metadata_test_${i}_timestamp`, now + i)
            }

            expect(mockStorage.size).toBe(1100)
            cacheManager.cleanupIfNeeded()

            const metadataKeys = Array.from(mockStorage.keys()).filter(
                key =>
                    key.startsWith('fedimod_metadata_') &&
                    !key.endsWith('_timestamp'),
            )

            expect(metadataKeys.length).toBe(400)
            expect(mockStorage.size).toBe(800)

            expect(mockStorage.has('fedimod_metadata_test_549')).toBe(true)
            expect(mockStorage.has('fedimod_metadata_test_400')).toBe(true)
            expect(mockStorage.has('fedimod_metadata_test_149')).toBe(false)
            expect(mockStorage.has('fedimod_metadata_test_0')).toBe(false)
        })

        it('clearShortcutMetadata only removes entries for that specific shortcut', () => {
            mockStorage.set('fedimod_metadata_shortcut1_url1', 'value')
            mockStorage.set(
                'fedimod_metadata_shortcut1_url1_timestamp',
                Date.now(),
            )
            mockStorage.set('fedimod_metadata_shortcut1_url2', 'value')
            mockStorage.set(
                'fedimod_metadata_shortcut1_url2_timestamp',
                Date.now(),
            )
            mockStorage.set('fedimod_metadata_shortcut2_url1', 'value')
            mockStorage.set(
                'fedimod_metadata_shortcut2_url1_timestamp',
                Date.now(),
            )
            mockStorage.set('fedimod_metadata_shortcut2_url2', 'value')
            mockStorage.set(
                'fedimod_metadata_shortcut2_url2_timestamp',
                Date.now(),
            )

            expect(mockStorage.size).toBe(8)

            cacheManager.clearShortcutMetadata('shortcut1')

            expect(mockStorage.has('fedimod_metadata_shortcut1_url1')).toBe(
                false,
            )
            expect(
                mockStorage.has('fedimod_metadata_shortcut1_url1_timestamp'),
            ).toBe(false)
            expect(mockStorage.has('fedimod_metadata_shortcut1_url2')).toBe(
                false,
            )
            expect(
                mockStorage.has('fedimod_metadata_shortcut1_url2_timestamp'),
            ).toBe(false)

            expect(mockStorage.has('fedimod_metadata_shortcut2_url1')).toBe(
                true,
            )
            expect(
                mockStorage.has('fedimod_metadata_shortcut2_url1_timestamp'),
            ).toBe(true)
            expect(mockStorage.has('fedimod_metadata_shortcut2_url2')).toBe(
                true,
            )
            expect(
                mockStorage.has('fedimod_metadata_shortcut2_url2_timestamp'),
            ).toBe(true)

            expect(mockStorage.size).toBe(4)
        })

        it('clearAllMetadata removes all fedimod entries but leaves other keys', () => {
            mockStorage.set('fedimod_metadata_test1', 'value1')
            mockStorage.set('fedimod_metadata_test1_timestamp', Date.now())
            mockStorage.set('fedimod_metadata_test2', 'value2')
            mockStorage.set('fedimod_metadata_test2_timestamp', Date.now())
            mockStorage.set('some_other_app_key', 'should_stay')
            mockStorage.set('another_unrelated_key', 'should_also_stay')

            expect(mockStorage.size).toBe(6)

            cacheManager.clearAllMetadata()

            expect(mockStorage.has('fedimod_metadata_test1')).toBe(false)
            expect(mockStorage.has('fedimod_metadata_test1_timestamp')).toBe(
                false,
            )
            expect(mockStorage.has('fedimod_metadata_test2')).toBe(false)
            expect(mockStorage.has('fedimod_metadata_test2_timestamp')).toBe(
                false,
            )

            expect(mockStorage.has('some_other_app_key')).toBe(true)
            expect(mockStorage.has('another_unrelated_key')).toBe(true)

            expect(mockStorage.size).toBe(2)
        })
    })

    describe('Cache Key Generation', () => {
        it('different inputs generate different cache keys', () => {
            const keys = [
                getMetadataCacheKey('shortcut1', 'https://example.com'),
                getMetadataCacheKey('shortcut2', 'https://example.com'),
                getMetadataCacheKey('shortcut1', 'https://other.com'),
                getMetadataCacheKey('shortcut2', 'https://other.com'),
            ]

            const uniqueKeys = new Set(keys)
            expect(uniqueKeys.size).toBe(4)
        })
    })

    describe('Cache Storage and Retrieval', () => {
        it('caching and retrieval works end-to-end', () => {
            const cacheKey = 'test_key'
            const iconUri = 'https://example.com/icon.png'

            expect(getCachedMetadata(cacheKey)).toBeUndefined()

            cacheMetadataWithTimestamp(cacheKey, iconUri)

            expect(getCachedMetadata(cacheKey)).toBe(iconUri)

            const timestampKey = `${cacheKey}_timestamp`
            const timestamp = mockStorage.get(timestampKey)
            expect(typeof timestamp).toBe('number')
            expect(timestamp).toBeGreaterThan(0)
        })
    })

    describe('Edge Cases', () => {
        it('cleanup to size larger than current entries does nothing', () => {
            mockStorage.set('fedimod_metadata_test', 'value')
            mockStorage.set('fedimod_metadata_test_timestamp', Date.now())

            expect(mockStorage.size).toBe(2)

            cacheManager.forceCleanupToSize(100)

            expect(mockStorage.size).toBe(2)
            expect(mockStorage.has('fedimod_metadata_test')).toBe(true)
        })
    })
})

describe('Integration Tests', () => {
    let cacheManager: MMKVCacheManager

    beforeEach(() => {
        ;(MMKVCacheManager as any).instance = undefined
        setupMockStorage()
        cacheManager = MMKVCacheManager.getInstance()
    })

    it('full cache lifecycle - store, retrieve, auto-cleanup when full', () => {
        const baseTime = Date.now()

        for (let shortcutId = 1; shortcutId <= 3; shortcutId++) {
            for (let urlId = 1; urlId <= 200; urlId++) {
                const cacheKey = getMetadataCacheKey(
                    `shortcut${shortcutId}`,
                    `https://site${urlId}.com`,
                )
                const iconUri = `https://icons.com/shortcut${shortcutId}_url${urlId}.png`

                mockStorage.set(cacheKey, iconUri)
                mockStorage.set(
                    `${cacheKey}_timestamp`,
                    baseTime + (shortcutId * 200 + urlId),
                )
            }
        }

        expect(mockStorage.size).toBe(1200)

        const testKey = getMetadataCacheKey('shortcut1', 'https://site50.com')
        expect(getCachedMetadata(testKey)).toBe(
            'https://icons.com/shortcut1_url50.png',
        )

        cacheManager.cleanupIfNeeded()

        const metadataKeys = Array.from(mockStorage.keys()).filter(
            key =>
                key.startsWith('fedimod_metadata_') &&
                !key.endsWith('_timestamp'),
        )
        expect(metadataKeys.length).toBe(400)

        expect(
            mockStorage.has(
                getMetadataCacheKey('shortcut1', 'https://site1.com'),
            ),
        ).toBe(false)
        expect(
            mockStorage.has(
                getMetadataCacheKey('shortcut1', 'https://site200.com'),
            ),
        ).toBe(false)

        expect(
            mockStorage.has(
                getMetadataCacheKey('shortcut2', 'https://site1.com'),
            ),
        ).toBe(true)
        expect(
            mockStorage.has(
                getMetadataCacheKey('shortcut3', 'https://site200.com'),
            ),
        ).toBe(true)

        const survivingKey = getMetadataCacheKey(
            'shortcut3',
            'https://site100.com',
        )
        expect(getCachedMetadata(survivingKey)).toBe(
            'https://icons.com/shortcut3_url100.png',
        )
    })

    it('shortcut deletion while cache is near capacity', () => {
        for (let shortcutId = 1; shortcutId <= 3; shortcutId++) {
            for (let urlId = 1; urlId <= 160; urlId++) {
                const cacheKey = getMetadataCacheKey(
                    `shortcut${shortcutId}`,
                    `https://url${urlId}.com`,
                )
                mockStorage.set(cacheKey, `icon_${shortcutId}_${urlId}`)
                mockStorage.set(`${cacheKey}_timestamp`, Date.now() + urlId)
            }
        }

        expect(mockStorage.size).toBe(960)

        cacheManager.clearShortcutMetadata('shortcut2')

        expect(mockStorage.size).toBe(640)

        expect(
            mockStorage.has(
                getMetadataCacheKey('shortcut2', 'https://url1.com'),
            ),
        ).toBe(false)
        expect(
            mockStorage.has(
                getMetadataCacheKey('shortcut2', 'https://url160.com'),
            ),
        ).toBe(false)

        expect(
            mockStorage.has(
                getMetadataCacheKey('shortcut1', 'https://url1.com'),
            ),
        ).toBe(true)
        expect(
            mockStorage.has(
                getMetadataCacheKey('shortcut3', 'https://url160.com'),
            ),
        ).toBe(true)

        for (let urlId = 161; urlId <= 180; urlId++) {
            const cacheKey = getMetadataCacheKey(
                'shortcut1',
                `https://url${urlId}.com`,
            )
            mockStorage.set(cacheKey, `icon_1_${urlId}`)
            mockStorage.set(`${cacheKey}_timestamp`, Date.now() + urlId)
        }

        expect(mockStorage.size).toBe(680)

        const sizeBefore = mockStorage.size
        cacheManager.cleanupIfNeeded()
        const sizeAfter = mockStorage.size

        expect(sizeAfter).toBe(sizeBefore)
    })
})
