/**
 * Translation entity types
 */

import type { TranslationStyle, SyncStatus } from './common'

// ============================================================================
// Local-Only Entity
// ============================================================================

/**
 * Translation - AI-generated translation
 * ID generation: UUID v5
 */
export interface Translation {
  id: string // UUID v5
  sourceText: string
  sourceLanguage: string
  targetLanguage: string
  translatedText: string
  style: TranslationStyle
  customPrompt?: string
  aiModel?: string
  syncStatus?: SyncStatus
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

// ============================================================================
// Store Input Types
// ============================================================================

/**
 * Input type for creating Translation
 */
export type TranslationInput = Omit<Translation, 'id' | 'createdAt' | 'updatedAt'>

