/**
 * Tests for Translation Store (Dexie database operations)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { Translation, TranslationStyle, TranslationInput } from '@/types/db'

// Create in-memory data store
const translationData = new Map<string, Translation>()

// Mock the database module BEFORE importing the store
vi.mock('../schema', () => ({
  db: {
    translations: {
      get: vi.fn((id: string) => Promise.resolve(translationData.get(id))),
      put: vi.fn((item: Translation) => {
        translationData.set(item.id, item)
        return Promise.resolve(item.id)
      }),
      update: vi.fn((id: string, changes: Partial<Translation>) => {
        const existing = translationData.get(id)
        if (existing) {
          translationData.set(id, { ...existing, ...changes })
          return Promise.resolve(1)
        }
        return Promise.resolve(0)
      }),
      delete: vi.fn((id: string) => {
        translationData.delete(id)
        return Promise.resolve()
      }),
      toArray: vi.fn(() => Promise.resolve(Array.from(translationData.values()))),
      where: vi.fn((index: string) => ({
        equals: vi.fn((value: unknown) => ({
          first: vi.fn(async () => {
            for (const item of translationData.values()) {
              if (index.startsWith('[')) {
                // Compound index
                const fields = index.slice(1, -1).split('+')
                const values = value as unknown[]
                const matches = fields.every((field, i) =>
                  (item as any)[field] === values[i]
                )
                if (matches) return item
              } else if ((item as any)[index] === value) {
                return item
              }
            }
            return undefined
          }),
          toArray: vi.fn(async () => {
            const results: Translation[] = []
            for (const item of translationData.values()) {
              if (index.startsWith('[')) {
                const fields = index.slice(1, -1).split('+')
                const values = value as unknown[]
                const matches = fields.every((field, i) =>
                  (item as any)[field] === values[i]
                )
                if (matches) results.push(item)
              } else if ((item as any)[index] === value) {
                results.push(item)
              }
            }
            return results
          }),
        })),
      })),
    },
  },
}))

// Mock ID generator
vi.mock('../id-generator', () => ({
  generateTranslationId: vi.fn((sourceText: string, targetLanguage: string, style: string, customPrompt?: string) => {
    const prompt = customPrompt || ''
    return `mock-id-${sourceText.slice(0, 10)}-${targetLanguage}-${style}-${prompt.slice(0, 10)}`
  }),
}))

// Import AFTER mocking
import {
  getTranslationById,
  getTranslationByTextAndStyle,
  getTranslationsBySourceText,
  getTranslationsBySourceLanguage,
  getTranslationsByTargetLanguage,
  getTranslationsByStyle,
  getTranslationsBySyncStatus,
  getAllTranslations,
  saveTranslation,
  updateTranslation,
  deleteTranslation,
  translationStore,
} from './translation-store'
import { generateTranslationId } from '../id-generator'
import { db } from '../schema'

describe('Translation Store', () => {
  beforeEach(() => {
    // Clear mock data
    translationData.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const createTestTranslation = (overrides: Partial<Translation> = {}): Translation => {
    const now = new Date().toISOString()
    return {
      id: 'test-id-1',
      sourceText: 'Hello world',
      sourceLanguage: 'en',
      translatedText: '你好世界',
      targetLanguage: 'zh',
      style: 'natural' as TranslationStyle,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }
  }

  describe('Query Operations', () => {
    describe('getTranslationById', () => {
      it('should return translation when found', async () => {
        const translation = createTestTranslation()
        translationData.set(translation.id, translation)

        const result = await getTranslationById(translation.id)
        expect(result).toEqual(translation)
        expect(db.translations.get).toHaveBeenCalledWith(translation.id)
      })

      it('should return undefined when not found', async () => {
        const result = await getTranslationById('non-existent-id')
        expect(result).toBeUndefined()
      })
    })

    describe('getTranslationByTextAndStyle', () => {
      it('should query with compound index', async () => {
        const translation = createTestTranslation()
        translationData.set(translation.id, translation)

        await getTranslationByTextAndStyle(
          translation.sourceText,
          translation.targetLanguage,
          translation.style
        )

        expect(db.translations.where).toHaveBeenCalledWith('[sourceText+targetLanguage+style]')
      })
    })

    describe('getTranslationsBySourceText', () => {
      it('should query by source text', async () => {
        const translation = createTestTranslation()
        translationData.set(translation.id, translation)

        await getTranslationsBySourceText(translation.sourceText)
        expect(db.translations.where).toHaveBeenCalledWith('sourceText')
      })
    })

    describe('getTranslationsBySourceLanguage', () => {
      it('should query by source language', async () => {
        await getTranslationsBySourceLanguage('en')
        expect(db.translations.where).toHaveBeenCalledWith('sourceLanguage')
      })
    })

    describe('getTranslationsByTargetLanguage', () => {
      it('should query by target language', async () => {
        await getTranslationsByTargetLanguage('zh')
        expect(db.translations.where).toHaveBeenCalledWith('targetLanguage')
      })
    })

    describe('getTranslationsByStyle', () => {
      it('should query by style', async () => {
        await getTranslationsByStyle('natural')
        expect(db.translations.where).toHaveBeenCalledWith('style')
      })
    })

    describe('getTranslationsBySyncStatus', () => {
      it('should query by sync status', async () => {
        await getTranslationsBySyncStatus('pending')
        expect(db.translations.where).toHaveBeenCalledWith('syncStatus')
      })
    })

    describe('getAllTranslations', () => {
      it('should return all translations', async () => {
        const translation1 = createTestTranslation({ id: 'id-1' })
        const translation2 = createTestTranslation({ id: 'id-2', sourceText: 'Goodbye' })
        translationData.set(translation1.id, translation1)
        translationData.set(translation2.id, translation2)

        const results = await getAllTranslations()
        expect(results).toHaveLength(2)
        expect(db.translations.toArray).toHaveBeenCalled()
      })
    })
  })

  describe('Mutation Operations', () => {
    describe('saveTranslation', () => {
      it('should create new translation with generated ID', async () => {
        const input: TranslationInput = {
          sourceText: 'Test',
          sourceLanguage: 'en',
          translatedText: '测试',
          targetLanguage: 'zh',
          style: 'natural' as TranslationStyle,
        }

        const id = await saveTranslation(input)

        expect(generateTranslationId).toHaveBeenCalledWith(
          input.sourceText,
          input.targetLanguage,
          input.style,
          undefined
        )
        expect(db.translations.put).toHaveBeenCalled()
        expect(id).toBeTruthy()
      })

      it('should update existing translation if ID exists', async () => {
        // First create an existing translation
        const existingId = 'mock-id-Update tes-zh-natural-'
        const existingTranslation = createTestTranslation({
          id: existingId,
          sourceText: 'Update test',
          translatedText: '更新测试',
        })
        translationData.set(existingId, existingTranslation)

        const input: TranslationInput = {
          sourceText: 'Update test',
          sourceLanguage: 'en',
          translatedText: '更新测试 - new',
          targetLanguage: 'zh',
          style: 'natural' as TranslationStyle,
        }

        await saveTranslation(input)

        expect(db.translations.update).toHaveBeenCalledWith(
          existingId,
          expect.objectContaining({
            translatedText: '更新测试 - new',
            updatedAt: expect.any(String),
          })
        )
      })

      it('should include custom prompt in ID generation', async () => {
        const input: TranslationInput = {
          sourceText: 'Custom test',
          sourceLanguage: 'en',
          translatedText: '自定义测试',
          targetLanguage: 'zh',
          style: 'custom' as TranslationStyle,
          customPrompt: 'Translate formally',
        }

        await saveTranslation(input)

        expect(generateTranslationId).toHaveBeenCalledWith(
          input.sourceText,
          input.targetLanguage,
          input.style,
          input.customPrompt
        )
      })
    })

    describe('updateTranslation', () => {
      it('should update translation with new values', async () => {
        const translation = createTestTranslation()
        translationData.set(translation.id, translation)

        await updateTranslation(translation.id, {
          translatedText: '新翻译',
        })

        expect(db.translations.update).toHaveBeenCalledWith(
          translation.id,
          expect.objectContaining({
            translatedText: '新翻译',
            updatedAt: expect.any(String),
          })
        )
      })
    })

    describe('deleteTranslation', () => {
      it('should delete translation by ID', async () => {
        const translation = createTestTranslation()
        translationData.set(translation.id, translation)

        await deleteTranslation(translation.id)

        expect(db.translations.delete).toHaveBeenCalledWith(translation.id)
      })
    })
  })

  describe('Store Object (Alternative API)', () => {
    it('should export all methods through store object', () => {
      expect(translationStore.getById).toBe(getTranslationById)
      expect(translationStore.getByTextAndStyle).toBe(getTranslationByTextAndStyle)
      expect(translationStore.getBySourceText).toBe(getTranslationsBySourceText)
      expect(translationStore.getBySourceLanguage).toBe(getTranslationsBySourceLanguage)
      expect(translationStore.getByTargetLanguage).toBe(getTranslationsByTargetLanguage)
      expect(translationStore.getByStyle).toBe(getTranslationsByStyle)
      expect(translationStore.getBySyncStatus).toBe(getTranslationsBySyncStatus)
      expect(translationStore.getAll).toBe(getAllTranslations)
      expect(translationStore.save).toBe(saveTranslation)
      expect(translationStore.update).toBe(updateTranslation)
      expect(translationStore.delete).toBe(deleteTranslation)
    })
  })
})
