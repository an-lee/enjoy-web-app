/**
 * CachedDefinition Repository - Database operations for dictionary cache
 */

import { getCurrentDatabase } from '../schema'
import { generateCachedDefinitionId } from '../id-generator'
import type { CachedDefinition } from '@/page/types/db'

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get cached definition by word and language pair
 * Returns undefined if cache is expired or not found
 */
export async function getCachedDefinition(
  word: string,
  languagePair: string
): Promise<CachedDefinition | undefined> {
  const cached = await getCurrentDatabase().cachedDefinitions.get([word, languagePair])
  if (cached && cached.expiresAt > Date.now()) {
    return cached
  }
  // Remove expired cache
  if (cached) {
    await getCurrentDatabase().cachedDefinitions.delete([word, languagePair])
  }
  return undefined
}

export async function getAllCachedDefinitions(): Promise<CachedDefinition[]> {
  return getCurrentDatabase().cachedDefinitions.toArray()
}

// ============================================================================
// Mutation Operations
// ============================================================================

/**
 * Set cached definition
 * @param word - The word to cache
 * @param languagePair - Language pair (e.g., 'en:zh')
 * @param data - The definition data to cache
 * @param ttl - Time to live in milliseconds (default: 24 hours)
 */
export async function setCachedDefinition(
  word: string,
  languagePair: string,
  data: unknown,
  ttl: number = 24 * 60 * 60 * 1000
): Promise<void> {
  const now = new Date().toISOString()
  const id = generateCachedDefinitionId(word, languagePair)
  await getCurrentDatabase().cachedDefinitions.put({
    id,
    word,
    languagePair,
    data,
    expiresAt: Date.now() + ttl,
    createdAt: now,
    updatedAt: now,
  })
}

export async function deleteCachedDefinition(
  word: string,
  languagePair: string
): Promise<void> {
  await getCurrentDatabase().cachedDefinitions.delete([word, languagePair])
}

export async function clearAllCachedDefinitions(): Promise<void> {
  await getCurrentDatabase().cachedDefinitions.clear()
}

/**
 * Clean up expired cache entries
 * @returns Number of expired entries removed
 */
export async function cleanupExpiredCache(): Promise<number> {
  const now = Date.now()
  const expired = await getCurrentDatabase().cachedDefinitions
    .where('expiresAt')
    .below(now)
    .toArray()
  const keys = expired.map(
    (item) => [item.word, item.languagePair] as [string, string]
  )
  await getCurrentDatabase().cachedDefinitions.bulkDelete(keys)
  return keys.length
}

// ============================================================================
// Repository Object (Alternative API)
// ============================================================================

export const cachedDefinitionRepository = {
  // Queries
  get: getCachedDefinition,
  getAll: getAllCachedDefinitions,
  // Mutations
  set: setCachedDefinition,
  delete: deleteCachedDefinition,
  clearAll: clearAllCachedDefinitions,
  cleanupExpired: cleanupExpiredCache,
}

