/**
 * Dictation Store - Database operations for Dictation entity
 */

import { db } from '../schema'
import { generateDictationId } from '../id-generator'
import type { Dictation, TargetType, SyncStatus, DictationInput } from '@/types/db'

// ============================================================================
// Query Operations
// ============================================================================

export async function getDictationById(id: string): Promise<Dictation | undefined> {
  return db.dictations.get(id)
}

export async function getDictationsByTarget(
  targetType: TargetType,
  targetId: string
): Promise<Dictation[]> {
  return db.dictations
    .where('[targetType+targetId]')
    .equals([targetType, targetId])
    .toArray()
}

export async function getDictationsBySyncStatus(
  status: SyncStatus
): Promise<Dictation[]> {
  return db.dictations.where('syncStatus').equals(status).toArray()
}

export async function getDictationsByLanguage(language: string): Promise<Dictation[]> {
  return db.dictations.where('language').equals(language).toArray()
}

export async function getAllDictations(): Promise<Dictation[]> {
  return db.dictations.toArray()
}

// ============================================================================
// Mutation Operations
// ============================================================================

export async function saveDictation(input: DictationInput): Promise<string> {
  const now = new Date().toISOString()
  const id = generateDictationId()

  const dictation: Dictation = {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
  }
  await db.dictations.put(dictation)
  return id
}

export async function updateDictation(
  id: string,
  updates: Partial<Omit<Dictation, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString()
  await db.dictations.update(id, {
    ...updates,
    updatedAt: now,
  })
}

export async function deleteDictation(id: string): Promise<void> {
  await db.dictations.delete(id)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate dictation accuracy
 * Returns accuracy as a percentage (0-100)
 */
export function calculateDictationAccuracy(
  referenceText: string,
  userInput: string
): {
  accuracy: number
  correctWords: number
  missedWords: number
  extraWords: number
} {
  const referenceWords = referenceText.toLowerCase().split(/\s+/).filter(Boolean)
  const userWords = userInput.toLowerCase().split(/\s+/).filter(Boolean)

  const referenceSet = new Set(referenceWords)

  let correctWords = 0
  for (const word of userWords) {
    if (referenceSet.has(word)) {
      correctWords++
    }
  }

  const missedWords = referenceWords.length - correctWords
  const extraWords = userWords.length - correctWords

  const accuracy =
    referenceWords.length > 0
      ? Math.round((correctWords / referenceWords.length) * 100)
      : 0

  return {
    accuracy,
    correctWords,
    missedWords,
    extraWords,
  }
}

// ============================================================================
// Store Object (Alternative API)
// ============================================================================

export const dictationStore = {
  // Queries
  getById: getDictationById,
  getByTarget: getDictationsByTarget,
  getBySyncStatus: getDictationsBySyncStatus,
  getByLanguage: getDictationsByLanguage,
  getAll: getAllDictations,
  // Mutations
  save: saveDictation,
  update: updateDictation,
  delete: deleteDictation,
  // Utilities
  calculateAccuracy: calculateDictationAccuracy,
}

