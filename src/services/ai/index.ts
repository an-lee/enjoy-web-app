/**
 * AI Services Unified Export
 */

export * from './types'
export * from './types-responses'
// Explicit re-exports to avoid naming conflicts with types-responses
export type { FastTranslationRequest } from './fast-translation'
export { fastTranslationService } from './fast-translation'
export * from './smart-translation'
export * from './translation' // Legacy: keep for backward compatibility
export * from './tts'
// Explicit re-exports to avoid naming conflicts with types-responses
export type { AssessmentRequest } from './assessment'
export { assessmentService } from './assessment'
export * from './dictionary'
export * from './asr'
export * from './enjoy' // Enjoy API services (includes azure-speech)
export * from './local'
export * from './provider-selector'
export * from './provider-adapters'
export * from './key-management'
export * from './prompts'
export * from './byok' // BYOK services

// Unified service manager
import { fastTranslationService } from './fast-translation'
import { smartTranslationService } from './smart-translation'
import { translationService } from './translation' // Legacy: maps to smartTranslationService
import { ttsService } from './tts'
import { assessmentService } from './assessment'
import { dictionaryService } from './dictionary'
import { asrService } from './asr'

export const aiServices = {
  fastTranslation: fastTranslationService,
  smartTranslation: smartTranslationService,
  translation: translationService, // Legacy: for backward compatibility
  tts: ttsService,
  assessment: assessmentService,
  dictionary: dictionaryService,
  asr: asrService,
}

