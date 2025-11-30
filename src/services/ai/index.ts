/**
 * AI Services Unified Export
 *
 * Note: Fast Translation and Basic Dictionary are regular API services (not AI services).
 * Import them from '@/lib/api' instead.
 */

export * from './types'
export * from './constants' // Error codes and configuration constants
export * from './smart-translation'
export * from './tts'
// Explicit re-exports to avoid naming conflicts with types-responses
export type { AssessmentRequest } from './assessment'
export { assessmentService } from './assessment'
export * from './dictionary' // Contextual dictionary (AI-powered)
export * from './asr'
export * from './enjoy' // Enjoy API services (includes azure-speech)
export * from './local'
export * from './provider-selector'
export * from './key-management'
export * from './prompts'
export * from './byok' // BYOK services

// Unified service manager
import { smartTranslationService } from './smart-translation'
import { ttsService } from './tts'
import { assessmentService } from './assessment'
import { dictionaryService } from './dictionary'
import { asrService } from './asr'

export const aiServices = {
  smartTranslation: smartTranslationService,
  tts: ttsService,
  assessment: assessmentService,
  dictionary: dictionaryService, // Contextual dictionary (AI-powered)
  asr: asrService,
}

