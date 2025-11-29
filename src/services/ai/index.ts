/**
 * AI Services Unified Export
 */

export * from './types'
export * from './fast-translation'
export * from './smart-translation'
export * from './translation' // Legacy: keep for backward compatibility
export * from './tts'
export * from './assessment'
export * from './dictionary'
export * from './asr'
export * from './azure-speech'
export * from './local-models'
export * from './provider-selector'
export * from './key-management'
export * from './prompts'

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

