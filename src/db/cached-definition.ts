import { db } from './database'
import type { CachedDefinition } from './schema'

export async function getCachedDefinition(
  word: string,
  languagePair: string
): Promise<CachedDefinition | undefined> {
  const cached = await db.cachedDefinitions.get([word, languagePair])
  if (cached && cached.expiresAt > Date.now()) {
    return cached
  }
  // Remove expired cache
  if (cached) {
    await db.cachedDefinitions.delete([word, languagePair])
  }
  return undefined
}

export async function setCachedDefinition(
  word: string,
  languagePair: string,
  data: unknown,
  ttl: number = 24 * 60 * 60 * 1000 // 24 hours default
): Promise<void> {
  const now = Date.now()
  await db.cachedDefinitions.put({
    id: `${word}-${languagePair}`,
    word,
    languagePair,
    data,
    expiresAt: now + ttl,
    createdAt: now,
    updatedAt: now,
  })
}

// Clean up expired cache entries
export async function cleanupExpiredCache(): Promise<number> {
  const now = Date.now()
  const expired = await db.cachedDefinitions
    .where('expiresAt')
    .below(now)
    .toArray()
  const keys = expired.map((item) => [item.word, item.languagePair] as [string, string])
  await db.cachedDefinitions.bulkDelete(keys)
  return keys.length
}

