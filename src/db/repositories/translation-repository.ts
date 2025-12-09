/**
 * Translation Repository - Database operations for Translation entity
 */

import { db } from '../schema'
import { generateTranslationId } from '../id-generator'
import type { Translation, TranslationStyle, SyncStatus, TranslationInput } from '@/types/db'

// ============================================================================
// Query Operations
// ============================================================================

export async function getTranslationById(id: string): Promise<Translation | undefined> {
  return db.translations.get(id)
}

export async function getTranslationByTextAndStyle(
  sourceText: string,
  targetLanguage: string,
  style: TranslationStyle
): Promise<Translation | undefined> {
  return db.translations
    .where('[sourceText+targetLanguage+style]')
    .equals([sourceText, targetLanguage, style])
    .first()
}

export async function getTranslationsBySourceText(
  sourceText: string
): Promise<Translation[]> {
  return db.translations.where('sourceText').equals(sourceText).toArray()
}

export async function getTranslationsBySourceLanguage(
  sourceLanguage: string
): Promise<Translation[]> {
  return db.translations.where('sourceLanguage').equals(sourceLanguage).toArray()
}

export async function getTranslationsByTargetLanguage(
  targetLanguage: string
): Promise<Translation[]> {
  return db.translations.where('targetLanguage').equals(targetLanguage).toArray()
}

export async function getTranslationsByStyle(
  style: TranslationStyle
): Promise<Translation[]> {
  return db.translations.where('style').equals(style).toArray()
}

export async function getTranslationsBySyncStatus(
  status: SyncStatus
): Promise<Translation[]> {
  return db.translations.where('syncStatus').equals(status).toArray()
}

export async function getAllTranslations(): Promise<Translation[]> {
  return db.translations.toArray()
}

// ============================================================================
// Mutation Operations
// ============================================================================

export async function saveTranslation(input: TranslationInput): Promise<string> {
  const now = new Date().toISOString()
  const id = generateTranslationId(
    input.sourceText,
    input.targetLanguage,
    input.style,
    input.customPrompt
  )

  const existing = await db.translations.get(id)
  if (existing) {
    await db.translations.update(id, {
      ...input,
      updatedAt: now,
    })
    return id
  }

  const translation: Translation = {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
  }
  await db.translations.put(translation)
  return id
}

export async function updateTranslation(
  id: string,
  updates: Partial<Omit<Translation, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString()
  await db.translations.update(id, {
    ...updates,
    updatedAt: now,
  })
}

export async function deleteTranslation(id: string): Promise<void> {
  await db.translations.delete(id)
}

// ============================================================================
// Repository Object (Alternative API)
// ============================================================================

export const translationRepository = {
  // Queries
  getById: getTranslationById,
  getByTextAndStyle: getTranslationByTextAndStyle,
  getBySourceText: getTranslationsBySourceText,
  getBySourceLanguage: getTranslationsBySourceLanguage,
  getByTargetLanguage: getTranslationsByTargetLanguage,
  getByStyle: getTranslationsByStyle,
  getBySyncStatus: getTranslationsBySyncStatus,
  getAll: getAllTranslations,
  // Mutations
  save: saveTranslation,
  update: updateTranslation,
  delete: deleteTranslation,
}

