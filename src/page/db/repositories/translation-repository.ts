/**
 * Translation Repository - Database operations for Translation entity
 */

import { getCurrentDatabase } from '../schema'
import { generateTranslationId } from '../id-generator'
import type { Translation, TranslationStyle, SyncStatus, TranslationInput } from '@/page/types/db'

// ============================================================================
// Query Operations
// ============================================================================

export async function getTranslationById(id: string): Promise<Translation | undefined> {
  return getCurrentDatabase().translations.get(id)
}

export async function getTranslationByTextAndStyle(
  sourceText: string,
  targetLanguage: string,
  style: TranslationStyle
): Promise<Translation | undefined> {
  return getCurrentDatabase().translations
    .where('[sourceText+targetLanguage+style]')
    .equals([sourceText, targetLanguage, style])
    .first()
}

export async function getTranslationsBySourceText(
  sourceText: string
): Promise<Translation[]> {
  return getCurrentDatabase().translations.where('sourceText').equals(sourceText).toArray()
}

export async function getTranslationsBySourceLanguage(
  sourceLanguage: string
): Promise<Translation[]> {
  return getCurrentDatabase().translations.where('sourceLanguage').equals(sourceLanguage).toArray()
}

export async function getTranslationsByTargetLanguage(
  targetLanguage: string
): Promise<Translation[]> {
  return getCurrentDatabase().translations.where('targetLanguage').equals(targetLanguage).toArray()
}

export async function getTranslationsByStyle(
  style: TranslationStyle
): Promise<Translation[]> {
  return getCurrentDatabase().translations.where('style').equals(style).toArray()
}

export async function getTranslationsBySyncStatus(
  status: SyncStatus
): Promise<Translation[]> {
  return getCurrentDatabase().translations.where('syncStatus').equals(status).toArray()
}

export async function getAllTranslations(): Promise<Translation[]> {
  return getCurrentDatabase().translations.toArray()
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

  const existing = await getCurrentDatabase().translations.get(id)
  if (existing) {
    await getCurrentDatabase().translations.update(id, {
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
  await getCurrentDatabase().translations.put(translation)
  return id
}

export async function updateTranslation(
  id: string,
  updates: Partial<Omit<Translation, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString()
  await getCurrentDatabase().translations.update(id, {
    ...updates,
    updatedAt: now,
  })
}

export async function deleteTranslation(id: string): Promise<void> {
  await getCurrentDatabase().translations.delete(id)
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

