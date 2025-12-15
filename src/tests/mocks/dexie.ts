/**
 * Mock implementation for Dexie (IndexedDB)
 * Provides in-memory database for testing
 */

import { vi } from 'vitest'
import type {
  Video,
  Audio,
  Transcript,
  Recording,
  Dictation,
  Translation,
  CachedDefinition,
  SyncQueueItem,
} from '@/types/db'

// ============================================================================
// In-Memory Store Types
// ============================================================================

interface InMemoryStore<T> {
  data: Map<string, T>
  clear: () => void
  get: (key: string) => Promise<T | undefined>
  put: (item: T, key?: string) => Promise<string>
  add: (item: T) => Promise<string>
  delete: (key: string) => Promise<void>
  update: (key: string, changes: Partial<T>) => Promise<number>
  toArray: () => Promise<T[]>
  where: (index: string) => WhereClause<T>
  orderBy: (index: string) => OrderByClause<T>
  count: () => Promise<number>
}

interface WhereClause<T> {
  equals: (value: unknown) => Collection<T>
  anyOf: (values: unknown[]) => Collection<T>
  between: (lower: unknown, upper: unknown) => Collection<T>
}

interface OrderByClause<T> {
  reverse: () => Collection<T>
  toArray: () => Promise<T[]>
}

interface Collection<T> {
  first: () => Promise<T | undefined>
  toArray: () => Promise<T[]>
  count: () => Promise<number>
  delete: () => Promise<number>
  modify: (changes: Partial<T> | ((item: T) => void)) => Promise<number>
}

// ============================================================================
// Mock Store Factory
// ============================================================================

function createMockStore<T extends { id?: string | number }>(
  keyPath: string = 'id'
): InMemoryStore<T> {
  const data = new Map<string, T>()

  const getKey = (item: T, providedKey?: string): string => {
    if (providedKey) return providedKey
    const key = (item as Record<string, unknown>)[keyPath]
    if (typeof key === 'string') return key
    if (typeof key === 'number') return key.toString()
    return crypto.randomUUID()
  }

  const filterByIndex = (index: string, value: unknown): T[] => {
    const items: T[] = []
    // Handle compound indexes like [sourceText+targetLanguage+style]
    if (index.startsWith('[') && index.endsWith(']')) {
      const fields = index.slice(1, -1).split('+')
      const values = value as unknown[]
      data.forEach((item) => {
        const matches = fields.every((field, i) => {
          const itemValue = (item as Record<string, unknown>)[field]
          return itemValue === values[i]
        })
        if (matches) items.push(item)
      })
    } else {
      data.forEach((item) => {
        const itemValue = (item as Record<string, unknown>)[index]
        if (itemValue === value) items.push(item)
      })
    }
    return items
  }

  const createCollection = (items: T[]): Collection<T> => ({
    first: async () => items[0],
    toArray: async () => items,
    count: async () => items.length,
    delete: async () => {
      let count = 0
      items.forEach((item) => {
        const key = (item as Record<string, unknown>)[keyPath] as string
        if (data.delete(key)) count++
      })
      return count
    },
    modify: async (changes) => {
      let count = 0
      items.forEach((item) => {
        const key = (item as Record<string, unknown>)[keyPath] as string
        if (typeof changes === 'function') {
          changes(item)
          data.set(key, item)
        } else {
          data.set(key, { ...item, ...changes })
        }
        count++
      })
      return count
    },
  })

  return {
    data,
    clear: () => data.clear(),
    get: async (key: string) => data.get(key),
    put: async (item: T, key?: string) => {
      const k = getKey(item, key)
      data.set(k, { ...item, [keyPath]: k } as T)
      return k
    },
    add: async (item: T) => {
      const k = getKey(item)
      if (data.has(k)) {
        throw new Error(`Key already exists: ${k}`)
      }
      data.set(k, { ...item, [keyPath]: k } as T)
      return k
    },
    delete: async (key: string) => {
      data.delete(key)
    },
    update: async (key: string, changes: Partial<T>) => {
      const item = data.get(key)
      if (!item) return 0
      data.set(key, { ...item, ...changes })
      return 1
    },
    toArray: async () => Array.from(data.values()),
    count: async () => data.size,
    where: (index: string) => ({
      equals: (value: unknown) => createCollection(filterByIndex(index, value)),
      anyOf: (values: unknown[]) => {
        const items: T[] = []
        values.forEach((value) => {
          items.push(...filterByIndex(index, value))
        })
        return createCollection(items)
      },
      between: (lower: unknown, upper: unknown) => {
        const items: T[] = []
        data.forEach((item) => {
          const itemValue = (item as Record<string, unknown>)[index]
          if (itemValue != null && (itemValue as any) >= (lower as any) && (itemValue as any) <= (upper as any)) {
            items.push(item)
          }
        })
        return createCollection(items)
      },
    }),
    orderBy: (index: string) => {
      const sortedItems = Array.from(data.values()).sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[index] as any
        const bVal = (b as Record<string, unknown>)[index] as any
        if (aVal < bVal) return -1
        if (aVal > bVal) return 1
        return 0
      })
      return {
        reverse: () => createCollection([...sortedItems].reverse()),
        toArray: async () => sortedItems,
      }
    },
  }
}

// ============================================================================
// Mock Database Class
// ============================================================================

export class MockEnjoyDatabase {
  videos = createMockStore<Video>('id')
  audios = createMockStore<Audio>('id')
  transcripts = createMockStore<Transcript>('id')
  recordings = createMockStore<Recording>('id')
  dictations = createMockStore<Dictation>('id')
  translations = createMockStore<Translation>('id')
  cachedDefinitions = createMockStore<CachedDefinition>('id')
  syncQueue = createMockStore<SyncQueueItem>('id')

  // private isOpen = false

  async open(): Promise<this> {
    return this
  }

  async close(): Promise<void> {
  }

  async delete(): Promise<void> {
    this.clearAll()
  }

  clearAll(): void {
    this.videos.clear()
    this.audios.clear()
    this.transcripts.clear()
    this.recordings.clear()
    this.dictations.clear()
    this.translations.clear()
    this.cachedDefinitions.clear()
    this.syncQueue.clear()
  }

  version(_version: number) {
    return {
      stores: () => this,
    }
  }
}

// ============================================================================
// Create Mock Database Instance
// ============================================================================

export const mockDb = new MockEnjoyDatabase()

/**
 * Setup mock for @/db/schema module
 * Call this in your test setup
 */
export function setupDexieMock() {
  vi.mock('@/db/schema', () => ({
    db: mockDb,
    EnjoyDatabase: MockEnjoyDatabase,
    initDatabase: vi.fn().mockResolvedValue(undefined),
  }))
}

/**
 * Reset database between tests
 */
export function resetMockDatabase() {
  mockDb.clearAll()
}

// ============================================================================
// Test Data Factories
// ============================================================================

export function createMockVideo(overrides: Partial<Video> = {}): Video {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    vid: `video-${Math.random().toString(36).slice(2, 10)}`,
    provider: 'youtube',
    title: 'Test Video',
    description: '',
    thumbnailUrl: '',
    duration: 120,
    language: 'en',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createMockAudio(overrides: Partial<Audio> = {}): Audio {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    aid: `audio-${Math.random().toString(36).slice(2, 10)}`,
    provider: 'user',
    title: 'Test Audio',
    description: '',
    thumbnailUrl: '',
    duration: 60,
    language: 'en',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createMockTranslation(overrides: Partial<Translation> = {}): Translation {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    sourceText: 'Hello world',
    sourceLanguage: 'en',
    translatedText: '你好世界',
    targetLanguage: 'zh',
    style: 'natural',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createMockTranscript(overrides: Partial<Transcript> = {}): Transcript {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    targetType: 'Video',
    targetId: crypto.randomUUID(),
    language: 'en',
    source: 'ai',
    timeline: [
      { start: 0, duration: 2000, text: 'Hello' },
      { start: 2000, duration: 2000, text: 'World' },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createMockRecording(overrides: Partial<Recording> = {}): Recording {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    targetType: 'Video',
    targetId: crypto.randomUUID(),
    referenceText: 'Hello world',
    // referenceId: crypto.randomUUID(),
    referenceStart: 0,
    referenceDuration: 2,
    language: 'en',
    duration: 2000,
    blob: new Blob(['test'], { type: 'audio/webm' }),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

